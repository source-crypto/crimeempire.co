import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { sounds } from '@/utils/sounds';

const MAX_NOTIFS = 20;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const addNotif = (notif) => {
    setNotifications(prev => [{ ...notif, id: Date.now() + Math.random(), ts: new Date().toLocaleTimeString() }, ...prev.slice(0, MAX_NOTIFS - 1)]);
    setUnread(n => n + 1);
    sounds.notification();
  };

  useEffect(() => {
    const unsubRaid = base44.entities.RaidHistory.subscribe((ev) => {
      if (ev.type === 'create') {
        addNotif({ icon: '🚨', text: `Raid launched on ${ev.data?.target_username}`, color: 'text-red-400' });
      }
    });
    const unsubTerritory = base44.entities.Territory.subscribe((ev) => {
      if (ev.type === 'update' && ev.data?.is_contested) {
        addNotif({ icon: '⚔️', text: `${ev.data?.name} is under attack!`, color: 'text-orange-400' });
      }
    });
    const unsubHit = base44.entities.HitContract.subscribe((ev) => {
      if (ev.type === 'create') {
        addNotif({ icon: '🎯', text: `New hit contract on ${ev.data?.target_username}`, color: 'text-yellow-400' });
      }
    });
    const unsubEvent = base44.entities.GlobalEvent.subscribe((ev) => {
      if (ev.type === 'create') {
        addNotif({ icon: ev.data?.icon || '🌍', text: ev.data?.title, color: 'text-purple-400' });
      }
    });

    return () => { unsubRaid(); unsubTerritory(); unsubHit(); unsubEvent(); };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(!open); if (!open) setUnread(0); }}
        className="relative p-2 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-900/20 transition-all">
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            >
              {unread > 9 ? '9+' : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 glass-panel border border-purple-500/30 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <span className="text-white font-semibold text-sm">Notifications</span>
              {notifications.length > 0 && (
                <button onClick={() => setNotifications([])} className="text-xs text-gray-500 hover:text-gray-300">Clear all</button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No notifications yet — the city is quiet...</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-800/40 hover:bg-slate-800/40">
                    <span className="text-lg flex-shrink-0">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${n.color || 'text-gray-300'} leading-tight`}>{n.text}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{n.ts}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}