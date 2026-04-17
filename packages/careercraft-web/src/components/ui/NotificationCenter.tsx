import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, TrendingUp, AlertCircle, CheckCircle, Info, Sparkles, Activity } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error" | "graph" | "insight";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionPath?: string;
  metadata?: {
    graphType?: string;
    value?: number;
    change?: number;
  };
}

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onActionClick?: (notification: Notification) => void;
}

const getNotificationStyle = (type: Notification["type"]) => {
  switch (type) {
    case "success":
      return {
        gradient: "from-emerald-500 to-teal-600",
        icon: CheckCircle,
        bgGradient: "from-emerald-50 to-teal-50",
        borderColor: "border-emerald-200",
        textColor: "text-emerald-700",
      };
    case "warning":
      return {
        gradient: "from-amber-500 to-orange-600",
        icon: AlertCircle,
        bgGradient: "from-amber-50 to-orange-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-700",
      };
    case "error":
      return {
        gradient: "from-red-500 to-rose-600",
        icon: AlertCircle,
        bgGradient: "from-red-50 to-rose-50",
        borderColor: "border-red-200",
        textColor: "text-red-700",
      };
    case "graph":
      return {
        gradient: "from-blue-500 to-indigo-600",
        icon: Activity,
        bgGradient: "from-blue-50 to-indigo-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-700",
      };
    case "insight":
      return {
        gradient: "from-purple-500 to-pink-600",
        icon: Sparkles,
        bgGradient: "from-purple-50 to-pink-50",
        borderColor: "border-purple-200",
        textColor: "text-purple-700",
      };
    default:
      return {
        gradient: "from-slate-500 to-gray-600",
        icon: Info,
        bgGradient: "from-slate-50 to-gray-50",
        borderColor: "border-slate-200",
        textColor: "text-slate-700",
      };
  }
};

export const NotificationCenter = ({
  notifications,
  onMarkAsRead,
  onClearAll,
  onActionClick,
}: NotificationCenterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      {/* Bell Button with Unread Badge */}
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <motion.div
          animate={unreadCount > 0 ? { rotate: [0, -15, 15, -15, 0] } : {}}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 5 }}
        >
          <Bell className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
        </motion.div>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <Badge className="h-5 min-w-5 px-1 bg-gradient-to-r from-red-500 to-pink-600 text-white border-0 text-xs font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          </motion.div>
        )}
      </Button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Notification Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute right-0 top-12 w-[420px] max-w-[calc(100vw-2rem)] z-50"
            >
              {/* Glassmorphic Container */}
              <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                {/* Header */}
                <div className="relative px-6 py-5 border-b border-slate-100">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        Notifications
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {unreadCount > 0
                          ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                          : "You're all caught up!"}
                      </p>
                    </div>
                    {notifications.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearAll}
                        className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                </div>

                {/* Notification List */}
                <div className="max-h-[480px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <Bell className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No notifications yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        We'll notify you when something important happens
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map((notification, index) => {
                        const style = getNotificationStyle(notification.type);
                        const Icon = style.icon;

                        return (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`relative p-4 hover:bg-gradient-to-br hover:${style.bgGradient} transition-all duration-300 cursor-pointer group ${
                              !notification.read ? "bg-blue-50/30" : ""
                            }`}
                            onClick={() => onMarkAsRead(notification.id)}
                          >
                            {/* Unread indicator */}
                            {!notification.read && (
                              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${style.gradient}`} />
                            )}

                            <div className="flex gap-3 pl-2">
                              {/* Icon */}
                              <div
                                className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}
                              >
                                <Icon className="w-5 h-5 text-white" />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h4 className={`font-semibold text-sm ${style.textColor}`}>
                                    {notification.title}
                                  </h4>
                                  {!notification.read && (
                                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                                  {notification.message}
                                </p>

                                {/* Metadata (for graph/insight types) */}
                                {notification.metadata && (
                                  <div className="flex items-center gap-3 mb-2">
                                    {notification.metadata.value !== undefined && (
                                      <div className="flex items-center gap-1 text-xs font-bold">
                                        <span className={style.textColor}>
                                          {notification.metadata.value}
                                        </span>
                                      </div>
                                    )}
                                    {notification.metadata.change !== undefined && (
                                      <div
                                        className={`flex items-center gap-1 text-xs font-semibold ${
                                          notification.metadata.change > 0
                                            ? "text-emerald-600"
                                            : "text-red-600"
                                        }`}
                                      >
                                        <TrendingUp
                                          className={`w-3 h-3 ${
                                            notification.metadata.change < 0
                                              ? "rotate-180"
                                              : ""
                                          }`}
                                        />
                                        {Math.abs(notification.metadata.change)}%
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-slate-400">
                                    {formatTimestamp(notification.timestamp)}
                                  </span>
                                  {notification.actionLabel && onActionClick && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onActionClick(notification);
                                      }}
                                      className={`text-xs h-7 px-3 hover:bg-gradient-to-r hover:${style.gradient} hover:text-white border ${style.borderColor}`}
                                    >
                                      {notification.actionLabel}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
