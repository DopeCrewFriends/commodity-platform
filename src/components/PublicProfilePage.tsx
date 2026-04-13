import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProfileData, Statistics } from '../types';
import { supabase } from '../utils/supabase';
import { useWallet } from '../hooks/useWallet';
import { useContacts } from '../hooks/useContacts';
import { useBalances } from '../hooks/useBalances';
import { useEscrows } from '../hooks/useEscrows';
import { useTradeHistory } from '../hooks/useTradeHistory';
import { normalizeProfileUsernameParam } from '../utils/profilePaths';
import { fetchPublicProfileStats, mapPublicStatsRowToStatistics } from '../utils/supabasePublicProfileStats';
import ProfileCard from './ProfileCard';
import BalancesSection from './BalancesSection';
import TradeHistorySection from './TradeHistorySection';
import { sharedTradeHistoryBetweenWallets } from '../utils/escrowTradeHistory';

function mapRowToProfileData(row: Record<string, unknown>): ProfileData {
  return {
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    company: String(row.company ?? ''),
    location: String(row.location ?? ''),
    walletAddress: String(row.wallet_address ?? ''),
    avatarImage: String(row.avatar_image ?? ''),
    username: String(row.username ?? ''),
    profileCreatedAt: (row.created_at as string) ?? null,
    rating: (row.rating as number | null | undefined) ?? null,
  };
}

const emptyStats: Statistics = {
  memberSince: null,
  completedTrades: 0,
  totalVolume: 0,
  successRate: null,
  rating: null,
};

function walletsMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const PublicProfilePage: React.FC = () => {
  const { username: usernameParam } = useParams<{ username: string }>();
  const normalized = normalizeProfileUsernameParam(usernameParam);
  const { walletAddress } = useWallet();
  const viewerWallet = walletAddress?.trim() ?? '';
  const { allContacts, sendContactRequest } = useContacts();
  const { tradeHistory } = useTradeHistory(viewerWallet || null);
  const { escrowsData } = useEscrows(viewerWallet || null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [statistics, setStatistics] = useState<Statistics>(emptyStats);
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading');
  const [contactActionBusy, setContactActionBusy] = useState(false);
  const [contactRequestPending, setContactRequestPending] = useState(false);
  const [contactActionMessage, setContactActionMessage] = useState<string | null>(null);
  const [contactActionError, setContactActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!normalized) {
      setLoadState('notfound');
      setProfile(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoadState('loading');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', normalized)
          .maybeSingle();

        if (cancelled) return;
        if (error || !data) {
          setProfile(null);
          setLoadState('notfound');
          return;
        }

        const pd = mapRowToProfileData(data as Record<string, unknown>);
        setProfile(pd);

        const statsRow = await fetchPublicProfileStats(pd.walletAddress);
        if (cancelled) return;
        setStatistics(mapPublicStatsRowToStatistics(statsRow, pd));
        setLoadState('ok');
      } catch (e) {
        console.error('Public profile load failed:', e);
        if (!cancelled) {
          setLoadState('error');
          setProfile(null);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [normalized]);

  const profileWallet = profile?.walletAddress?.trim() ?? '';

  const isOwnProfile = Boolean(
    profile && viewerWallet && profileWallet && walletsMatch(profileWallet, viewerWallet)
  );

  const isContact = useMemo(() => {
    if (!profileWallet) return false;
    return allContacts.some((c) => c.walletAddress && walletsMatch(c.walletAddress, profileWallet));
  }, [allContacts, profileWallet]);

  const balancesUnlocked = isOwnProfile || isContact;

  const sharedTradeHistoryWithMember = useMemo(() => {
    if (!viewerWallet || !profileWallet || !isContact) {
      return { completed: [], ongoing: [], unsuccessful: [] };
    }
    return sharedTradeHistoryBetweenWallets(tradeHistory, escrowsData.items, viewerWallet, profileWallet);
  }, [viewerWallet, profileWallet, isContact, tradeHistory, escrowsData.items]);

  const balanceWalletForFetch = balancesUnlocked && profileWallet ? profileWallet : null;
  const { balances, solPrice, loading: balancesLoading, priceLoading } = useBalances(balanceWalletForFetch);

  useEffect(() => {
    setContactActionMessage(null);
    setContactActionError(null);
    setContactRequestPending(false);
  }, [normalized, balancesUnlocked]);

  const handleAddContactForBalances = useCallback(async () => {
    if (!profile?.username?.trim()) return;
    setContactActionBusy(true);
    setContactActionError(null);
    setContactActionMessage(null);
    try {
      await sendContactRequest(profile.username.trim());
      setContactRequestPending(true);
      setContactActionMessage('You’ll see their balances after they accept.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send request';
      setContactActionError(msg);
    } finally {
      setContactActionBusy(false);
    }
  }, [profile?.username, sendContactRequest]);

  const lockedBalancesAction = useMemo(() => {
    if (balancesUnlocked || !profile) return null;

    if (!viewerWallet) {
      return (
        <>
          <p className="public-profile-balance-hint">Connect your wallet to add this member as a contact.</p>
          <Link to="/" className="btn btn-primary">
            Connect wallet
          </Link>
        </>
      );
    }

    return (
      <>
        <button
          type="button"
          className={contactRequestPending ? 'btn btn-secondary' : 'btn btn-primary'}
          disabled={contactActionBusy || contactRequestPending || !profile.username?.trim()}
          onClick={() => void handleAddContactForBalances()}
        >
          {contactActionBusy
            ? 'Sending…'
            : contactRequestPending
              ? 'Contact request pending'
              : 'Add contact to view balances'}
        </button>
        {!profile.username?.trim() ? (
          <p className="public-profile-balance-hint">This profile has no username; balances can’t be unlocked via contact.</p>
        ) : null}
        {contactActionMessage ? (
          <p className="public-profile-balance-hint">{contactActionMessage}</p>
        ) : null}
        {contactActionError ? (
          <p className="public-profile-balance-hint public-profile-balance-hint--error">{contactActionError}</p>
        ) : null}
      </>
    );
  }, [
    balancesUnlocked,
    profile,
    viewerWallet,
    contactActionBusy,
    contactRequestPending,
    contactActionMessage,
    contactActionError,
    handleAddContactForBalances,
  ]);

  return (
    <main className="portfolio-dashboard dash-inst" id="public-profile">
      <div className="dash-inst-container">
        <header className="dash-inst-header">
          <div>
            <p className="dash-inst-kicker">Profile</p>
            <h1 className="dash-inst-title">{normalized ? `@${normalized}` : 'Member'}</h1>
            <p className="dash-inst-header__lede">Public organisation profile</p>
          </div>
        </header>

        {loadState === 'loading' ? (
          <p className="public-profile-status">Loading profile…</p>
        ) : null}

        {loadState === 'notfound' ? (
          <p className="public-profile-status">No profile matches this username.</p>
        ) : null}

        {loadState === 'error' ? (
          <p className="public-profile-status">Could not load this profile. Try again later.</p>
        ) : null}

        {loadState === 'ok' && profile ? (
          <div className="public-profile-body">
            {isOwnProfile ? (
              <p className="public-profile-own-hint">
                This is you.{' '}
                <Link to="/account">Open your account</Link> to edit.
              </p>
            ) : null}
            <div className="dash-inst-row dash-inst-row--account">
              <ProfileCard
                profileData={profile}
                statistics={statistics}
                walletAddress={profile.walletAddress}
                showEditButton={false}
                profileVariant="public"
              />
              <BalancesSection
                balances={balances}
                solPrice={solPrice}
                loading={balancesLoading}
                priceLoading={priceLoading}
                balancesLocked={!balancesUnlocked}
                lockedAction={!balancesUnlocked ? lockedBalancesAction : undefined}
              />
            </div>

            {!isOwnProfile && normalized ? (
              <section className="public-profile-shared-trades" aria-labelledby="public-profile-trades-heading">
                {isContact && viewerWallet ? (
                  <TradeHistorySection
                    title={`Trade history with @${normalized}`}
                    emptyMessage={`No trade history with @${normalized}.`}
                    tradeHistory={sharedTradeHistoryWithMember}
                    walletAddress={viewerWallet}
                  />
                ) : (
                  <div className="trade-history-panel active-escrows-section escrows-section public-profile-trades-locked">
                    <div className="escrows-header-card">
                      <div className="escrows-header-content">
                        <div className="escrows-title-section">
                          <h2 id="public-profile-trades-heading">Trade history with @{normalized}</h2>
                        </div>
                      </div>
                      <div className="active-escrows-content">
                        <div className="no-escrows-message">
                          <p>No trade history with @{normalized}.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default PublicProfilePage;
