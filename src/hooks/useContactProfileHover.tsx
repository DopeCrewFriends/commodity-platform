import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ProfileData } from '../types';
import ContactProfileHoverPanel from '../components/ContactProfileHoverPanel';

const PANEL_W = 300;
const MARGIN = 10;
const LEAVE_DELAY_MS = 100;
const Z_FLOAT = 10020;

/**
 * Fixed-position profile preview on row hover (portal to body — avoids overflow clipping in modal lists).
 */
export function useContactProfileHover() {
  const [state, setState] = useState<{ profile: Partial<ProfileData>; rect: DOMRect } | null>(null);
  const leaveTimer = useRef<number | null>(null);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimer.current != null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearLeaveTimer(), [clearLeaveTimer]);

  useEffect(() => {
    if (!state) return;
    const close = () => setState(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [state]);

  const openAt = useCallback(
    (el: HTMLElement, profile: Partial<ProfileData>) => {
      clearLeaveTimer();
      setState({ profile, rect: el.getBoundingClientRect() });
    },
    [clearLeaveTimer]
  );

  const onRowMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>, profile: Partial<ProfileData>) => {
      openAt(e.currentTarget, profile);
    },
    [openAt]
  );

  const onRowFocus = useCallback(
    (e: React.FocusEvent<HTMLElement>, profile: Partial<ProfileData>) => {
      openAt(e.currentTarget, profile);
    },
    [openAt]
  );

  const onRowMouseLeave = useCallback(() => {
    leaveTimer.current = window.setTimeout(() => setState(null), LEAVE_DELAY_MS);
  }, []);

  const onRowBlur = useCallback((e: React.FocusEvent<HTMLElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    leaveTimer.current = window.setTimeout(() => setState(null), LEAVE_DELAY_MS);
  }, []);

  const onPanelMouseEnter = useCallback(() => {
    clearLeaveTimer();
  }, [clearLeaveTimer]);

  const onPanelMouseLeave = useCallback(() => {
    leaveTimer.current = window.setTimeout(() => setState(null), LEAVE_DELAY_MS);
  }, []);

  const panelStyle = useMemo((): React.CSSProperties | null => {
    if (!state) return null;
    const { rect } = state;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.right + MARGIN;
    if (left + PANEL_W > vw - MARGIN) {
      left = Math.max(MARGIN, rect.left - PANEL_W - MARGIN);
    }
    const approxH = 380;
    let top = rect.top;
    if (top + approxH > vh - MARGIN) {
      top = Math.max(MARGIN, vh - approxH - MARGIN);
    }
    return {
      position: 'fixed',
      left,
      top,
      width: PANEL_W,
      maxHeight: `min(420px, calc(100vh - ${MARGIN * 2}px))`,
      zIndex: Z_FLOAT,
      overflow: 'auto',
    };
  }, [state]);

  const hoverLayer =
    state && panelStyle
      ? createPortal(
          <div
            className="cem-profile-hover-floating"
            style={panelStyle}
            onMouseEnter={onPanelMouseEnter}
            onMouseLeave={onPanelMouseLeave}
            role="tooltip"
          >
            <ContactProfileHoverPanel profile={state.profile} />
          </div>,
          document.body
        )
      : null;

  return {
    onRowMouseEnter,
    onRowMouseLeave,
    onRowFocus,
    onRowBlur,
    hoverLayer,
  };
}
