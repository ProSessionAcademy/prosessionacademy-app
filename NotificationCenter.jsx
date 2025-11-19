import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  X,
  MessageSquare,
  Calendar,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
  FileText,
  Mail,
  Settings
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

const iconMap = {
  message: MessageSquare,
  event: Calendar,
  group: Users,
  course: BookOpen,
  task: CheckCircle,
  announcement: AlertCircle,
  document: FileText,
  email: Mail,
  default: Bell
};

export default function NotificationCenter({ user }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const currentUser = await base44.auth.me();
      return currentUser.notifications || [];
    },
    enabled: !!user?.email,
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const currentUser = await base44.auth.me();
      const updatedNotifications = (currentUser.notifications || []).map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      return base44.auth.updateMe({ notifications: updatedNotifications });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetch();
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      const updatedNotifications = (currentUser.notifications || []).map(n => ({ ...n, read: true }));
      return base44.auth.updateMe({ notifications: updatedNotifications });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetch();
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return base44.auth.updateMe({ notifications: [] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetch();
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={() => markAllAsReadMutation.mutate()}>
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => clearAllMutation.mutate()}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                .map((notification) => {
                  const Icon = iconMap[notification.icon] || iconMap.default;
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-4 text-left transition-colors hover:bg-slate-50 ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          !notification.read ? 'bg-blue-600' : 'bg-slate-200'
                        }`}>
                          <Icon className={`w-5 h-5 ${!notification.read ? 'text-white' : 'text-slate-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <p className={`font-semibold text-sm ${!notification.read ? 'text-slate-900' : 'text-slate-600'}`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2 mt-1"></div>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mb-1">{notification.message}</p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-3">
          <Link to="/settings">
            <Button variant="ghost" size="sm" className="w-full">
              <Settings className="w-4 h-4 mr-2" />
              Notification Settings
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}