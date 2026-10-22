'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import { FiCheck, FiSettings, FiBellOff, FiSend, FiImage, FiLink, FiX } from "react-icons/fi";
import { IconType } from "react-icons";
import {
  FiCheckCircle,
  FiCreditCard,
  FiAlertTriangle,
  FiInfo,
  FiPhoneCall,
  FiXCircle,
  FiDollarSign,
  FiShield,
  FiUserCheck,
  FiFileText,
} from "react-icons/fi";
import { Button } from "@/components/ui";

interface NotificationStyle {
  Icon: IconType;
  bg: string;
  color: string;
}

const notificationStyles: Record<string, NotificationStyle> = {
  LISTING_APPROVED: {
    Icon: FiCheckCircle,
    bg: "bg-gain-bg ",
    color: "text-gain ",
  },

  FUNDING_GOAL_MET: {
    Icon: FiCreditCard,
    bg: "bg-accent-bg ",
    color: "text-accent ",
  },

  DOCUMENT_REQUIRED: {
    Icon: FiAlertTriangle,
    bg: "bg-warn-bg ",
    color: "text-warn ",
  },

  SYSTEM_MAINTENANCE: {
    Icon: FiInfo,
    bg: "bg-accent-bg ",
    color: "text-accent ",
  },

  NEW_FEATURE: {
    Icon: FiPhoneCall,
    bg: "bg-info-bg ",
    color: "text-info ",
  },

  LISTING_REJECTED: {
    Icon: FiXCircle,
    bg: "bg-loss-bg ",   // EXACT screenshot red
    color: "text-loss ",
  },

  PAYOUT_SUCCESSFUL: {
    Icon: FiDollarSign,
    bg: "bg-gain-bg ",   // EXACT screenshot green
    color: "text-gain ",
  },

  SECURITY_UPDATE: {
    Icon: FiShield,
    bg: "bg-surface-hover ",   // EXACT screenshot gray
    color: "text-muted ",
  },

  KYC_SUBMITTED: {
    Icon: FiUserCheck,
    bg: "bg-accent-bg ",
    color: "text-accent ",
  },

  FRACTIONALIZATION_REQUEST: {
    Icon: FiFileText,
     bg: "bg-warn-bg ",
    color: "text-warn ",
  },
};




// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

enum NotificationType {
  FRACTIONALIZATION_REQUEST = 'FRACTIONALIZATION_REQUEST',
  KYC_SUBMITTED = 'KYC_SUBMITTED',
  LISTING_APPROVED = 'LISTING_APPROVED',
  FUNDING_GOAL_MET = 'FUNDING_GOAL_MET',
  DOCUMENT_REQUIRED = 'DOCUMENT_REQUIRED',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  NEW_FEATURE = 'NEW_FEATURE',
  LISTING_REJECTED = 'LISTING_REJECTED',
  PAYOUT_SUCCESSFUL = 'PAYOUT_SUCCESSFUL',
  SECURITY_UPDATE = 'SECURITY_UPDATE',
}

interface Notification {
  id: string;
  recipientRole: 'ADMIN' | 'USER';
  recipientUserId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
}

interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  older: Notification[];
}


const getNotificationStyle = (type: string): NotificationStyle => {
  return notificationStyles[type] || notificationStyles.SECURITY_UPDATE;
};

const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return '1 week ago';
  return `${diffWeeks} weeks ago`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Broadcast state
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastImage, setBroadcastImage] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    try {
      setBroadcastSending(true);
      setBroadcastResult(null);
      await api.post('/notifications/broadcast', {
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        ...(broadcastImage.trim() ? { image: broadcastImage.trim() } : {}),
        ...(broadcastLink.trim() ? { link: broadcastLink.trim() } : {}),
      });
      setBroadcastResult({ ok: true, msg: 'Push notification sent to all users!' });
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastImage('');
      setBroadcastLink('');
    } catch {
      setBroadcastResult({ ok: false, msg: 'Failed to send notification. Please try again.' });
    } finally {
      setBroadcastSending(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<Notification[]>('/notifications');
      setNotifications(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      await Promise.all(unreadIds.map(id => axios.patch(`/api/notifications/${id}/read`)));
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Group notifications by time period
  const groupNotifications = useCallback((): GroupedNotifications => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return notifications.reduce(
      (acc, notification) => {
        const notifDate = new Date(notification.createdAt);
        const notifDay = new Date(
          notifDate.getFullYear(),
          notifDate.getMonth(),
          notifDate.getDate()
        );

        if (notifDay.getTime() === today.getTime()) {
          acc.today.push(notification);
        } else if (notifDay.getTime() === yesterday.getTime()) {
          acc.yesterday.push(notification);
        } else {
          acc.older.push(notification);
        }
        return acc;
      },
      { today: [], yesterday: [], older: [] } as GroupedNotifications
    );
  }, [notifications]);

  const grouped = groupNotifications();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Render notification card
const renderNotification = (notification: Notification) => {
  const { Icon, bg, color } = getNotificationStyle(notification.type);

  return (
    <div
      key={notification.id}
      onClick={() => !notification.isRead && markAsRead(notification.id)}
      className="px-6 py-5 flex gap-4 items-start cursor-pointer bg-surface border-b border-muted/10 hover:bg-accent-bg transition-colors"
    >
      {/* Icon bubble */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg}`}
      >
        <Icon className={`w-[18px] h-[18px] ${color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">

          <div className="min-w-0">
            {/* Title */}
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-heading text-sm truncate">
                {notification.title}
              </h3>

              {/* ONLY unread indicator (no blue background row) */}
              {!notification.isRead && (
                <span className="w-2 h-2 rounded-full bg-accent" />
              )}
            </div>

            {/* Message */}
            <p className="text-sm text-body mt-1 leading-relaxed truncate">
              {notification.message}
            </p>
          </div>

          {/* Time */}
          <span className="text-xs text-faint whitespace-nowrap shrink-0">
            {getTimeAgo(notification.createdAt)}
          </span>

        </div>
      </div>
    </div>
  );
};





  // Render notification section
const renderSection = (title: string, notifications: Notification[]) => {
  if (notifications.length === 0) return null;

  return (
    <div className="flex flex-col gap-5 mt-8">

      {/* ===== Section Title + divider ===== */}
      <div className="flex items-center gap-4">

        {/* Bigger + bold */}
        <h2 className="text-body font-bold text-sm uppercase tracking-wider">
          {title}
        </h2>

        {/* Visible soft divider */}
        <div className="flex-1 h-[1px] bg-hairline" />
      </div>

      {/* Card container */}
      <div className="bg-surface rounded-md border border-hairline shadow-sm overflow-hidden">
        {notifications.map(renderNotification)}
      </div>
    </div>
  );
};




   if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-raised">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <span className="material-symbols-outlined text-loss text-5xl mb-4">error</span>
          <p className="text-loss font-medium">{error}</p>
          <button
            onClick={fetchNotifications}
            className="gold-gradient mt-4 rounded-md px-4 py-2 text-sm font-semibold transition-all active:scale-[0.99]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
<div className="w-full bg-raised min-h-screen pt-22 pb-16">
  {/* pt-28 = safe spacing for fixed navbar */}

  <div className="max-w-[1000px] mx-auto px-4 md:px-8 flex flex-col gap-10 text-heading">

    {/* ================= HEADER ================= */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

      <div>
        {/* BLACK title */}
        <h1 className="text-black text-3xl md:text-4xl font-black tracking-[-0.03em]">
          Notifications
        </h1>

        {/* BLACK subtitle (not grey anymore) */}
        <p className="text-black/70 text-base mt-1">
          Stay updated with your property listings, system alerts, and platform news.
        </p>
      </div>


      <div className="flex items-center gap-3">

        {/* Mark all read */}
        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-hairline rounded-lg shadow-sm text-sm font-medium text-black hover:bg-raised transition-colors disabled:opacity-50"
        >
          <FiCheck className="w-4 h-4" />
          Mark all as read
        </button>

        {/* Settings */}
        <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-hairline shadow-sm rounded-lg text-sm font-medium text-black hover:bg-raised transition-colors">
          <FiSettings className="w-4 h-4" />
          Settings
        </button>

      </div>
    </div>


    {/* ================= BROADCAST PANEL ================= */}
    <div className="bg-surface rounded-lg border border-hairline shadow-sm overflow-hidden">
      {/* Header row — always visible */}
      <button
        onClick={() => { setBroadcastOpen(o => !o); setBroadcastResult(null); }}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-raised transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent-bg flex items-center justify-center">
            <FiSend className="w-4 h-4 text-accent-text" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm text-black">Send Push Notification</p>
            <p className="text-xs text-muted">Broadcast to all users with title, message, image &amp; link</p>
          </div>
        </div>
        <FiX className={`w-4 h-4 text-muted transition-transform duration-200 ${broadcastOpen ? 'rotate-0' : 'rotate-45'}`} />
      </button>

      {/* Expandable form */}
      {broadcastOpen && (
        <div className="px-6 pb-6 flex flex-col gap-4 border-t border-hairline pt-4">
          {/* Title + Message */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-body uppercase tracking-wide">Title *</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                placeholder="e.g. New Property Listed!"
                className="px-4 py-2.5 rounded-md border border-hairline bg-raised text-sm text-black placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-body uppercase tracking-wide">Message *</label>
              <input
                type="text"
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="e.g. Check out the latest listings on the marketplace."
                className="px-4 py-2.5 rounded-md border border-hairline bg-raised text-sm text-black placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Image + Link */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-body uppercase tracking-wide flex items-center gap-1.5">
                <FiImage className="w-3.5 h-3.5" /> Image URL <span className="font-normal normal-case text-muted">(optional)</span>
              </label>
              <input
                type="url"
                value={broadcastImage}
                onChange={e => setBroadcastImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="px-4 py-2.5 rounded-md border border-hairline bg-raised text-sm text-black placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-body uppercase tracking-wide flex items-center gap-1.5">
                <FiLink className="w-3.5 h-3.5" /> Deep Link <span className="font-normal normal-case text-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={broadcastLink}
                onChange={e => setBroadcastLink(e.target.value)}
                placeholder="/marketPlace or https://..."
                className="px-4 py-2.5 rounded-md border border-hairline bg-raised text-sm text-black placeholder-faint focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Image preview */}
          {broadcastImage.trim() && (
            <div className="rounded-md overflow-hidden border border-hairline h-36 bg-surface-hover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={broadcastImage} alt="Preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}

          {/* Result message */}
          {broadcastResult && (
            <p className={`text-sm font-semibold ${broadcastResult.ok ? 'text-gain ' : 'text-loss '}`}>
              {broadcastResult.msg}
            </p>
          )}

          {/* Send button */}
          <div className="flex justify-end">
            <button
              onClick={sendBroadcast}
              disabled={broadcastSending || !broadcastTitle.trim() || !broadcastMessage.trim()}
              className="gold-gradient flex items-center gap-2 rounded-md px-6 py-2.5 text-sm font-semibold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiSend className="w-4 h-4" />
              {broadcastSending ? 'Sending...' : 'Send to All Users'}
            </button>
          </div>
        </div>
      )}
    </div>

    {/* ================= EMPTY STATE ================= */}
    {notifications.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-24 text-center">

        <FiBellOff className="text-faint text-7xl mb-4" />

        <h3 className="text-xl font-bold text-black mb-2">
          No notifications yet
        </h3>

        <p className="text-black/60">
          {"You're all caught up! We'll notify you when something new happens."}

        </p>
      </div>
    ) : (

      /* ================= SECTIONS ================= */
      <div className="flex flex-col text-black gap-10">

        {renderSection("Today", grouped.today)}
        {renderSection("Yesterday", grouped.yesterday)}
        {renderSection("Older", grouped.older)}

        <div className="flex justify-center">
          <Button variant="secondary">Load More Notifications</Button>
        </div>
      </div>
    )}

  </div>
</div>

  );
};

export default NotificationsPage;
