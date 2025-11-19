import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  MessageSquare, 
  Pin, 
  FileText, 
  Calendar as CalendarIcon,
  ClipboardList,
  X,
  Filter,
  User,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GlobalSearch({ isOpen, onClose, currentGroup }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allGroups = [] } = useQuery({
    queryKey: ['allGroupsForSearch'],
    queryFn: () => base44.entities.Group.list(),
    initialData: [],
  });

  // Get the specific group or all groups
  const groupsToSearch = currentGroup ? [currentGroup] : allGroups.filter(g => {
    const userEmail = user?.email?.toLowerCase();
    const isMember = g.members?.some(m => m.user_email?.toLowerCase() === userEmail);
    const isAdmin = g.admin_emails?.some(email => email?.toLowerCase() === userEmail);
    return isMember || isAdmin;
  });

  // Extract all searchable data
  const getAllSearchableData = () => {
    const results = {
      messages: [],
      notices: [],
      documents: [],
      events: [],
      tasks: []
    };

    groupsToSearch.forEach(group => {
      // Messages
      (group.group_chat_messages || []).forEach(msg => {
        results.messages.push({
          ...msg,
          groupId: group.id,
          groupName: group.name,
          type: 'message',
          searchText: `${msg.message} ${msg.sender_name}`.toLowerCase(),
          date: new Date(msg.timestamp),
          author: msg.sender_name,
          category: 'chat'
        });
      });

      // Notices
      (group.notice_board || []).forEach(notice => {
        results.notices.push({
          ...notice,
          groupId: group.id,
          groupName: group.name,
          type: 'notice',
          searchText: `${notice.title} ${notice.content} ${notice.author_name}`.toLowerCase(),
          date: new Date(notice.created_date),
          author: notice.author_name,
          category: 'notice'
        });
      });

      // Documents
      (group.shared_documents || []).forEach(doc => {
        results.documents.push({
          ...doc,
          groupId: group.id,
          groupName: group.name,
          type: 'document',
          searchText: `${doc.title} ${doc.description || ''} ${doc.uploaded_by_name}`.toLowerCase(),
          date: new Date(doc.uploaded_date),
          author: doc.uploaded_by_name,
          category: 'document'
        });
      });

      // Events
      (group.group_events || []).forEach(event => {
        results.events.push({
          ...event,
          groupId: group.id,
          groupName: group.name,
          type: 'event',
          searchText: `${event.title} ${event.description || ''} ${event.created_by_name}`.toLowerCase(),
          date: new Date(event.created_date),
          author: event.created_by_name,
          category: event.event_type
        });
      });

      // Tasks
      (group.tasks || []).forEach(task => {
        results.tasks.push({
          ...task,
          groupId: group.id,
          groupName: group.name,
          type: 'task',
          searchText: `${task.title} ${task.description || ''} ${task.created_by_name || ''}`.toLowerCase(),
          date: new Date(task.created_date),
          author: task.created_by_name,
          category: task.status
        });
      });
    });

    return results;
  };

  const allData = getAllSearchableData();

  // Filter results
  const filterResults = (items) => {
    if (!searchQuery.trim()) return [];

    let filtered = items.filter(item => 
      item.searchText.includes(searchQuery.toLowerCase())
    );

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(item => {
        const itemDate = item.date;
        if (dateFilter === 'today') {
          return itemDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return itemDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return itemDate >= monthAgo;
        }
        return true;
      });
    }

    // Author filter
    if (authorFilter !== 'all') {
      filtered = filtered.filter(item => item.author === authorFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    return filtered.sort((a, b) => b.date - a.date);
  };

  const allResults = [
    ...filterResults(allData.messages),
    ...filterResults(allData.notices),
    ...filterResults(allData.documents),
    ...filterResults(allData.events),
    ...filterResults(allData.tasks)
  ].sort((a, b) => b.date - a.date);

  const messageResults = filterResults(allData.messages);
  const noticeResults = filterResults(allData.notices);
  const documentResults = filterResults(allData.documents);
  const eventResults = filterResults(allData.events);
  const taskResults = filterResults(allData.tasks);

  // Get unique authors for filter
  const allAuthors = [...new Set(allResults.map(r => r.author).filter(Boolean))];

  // Get unique categories for filter
  const allCategories = [...new Set(allResults.map(r => r.category).filter(Boolean))];

  const clearFilters = () => {
    setDateFilter('all');
    setAuthorFilter('all');
    setCategoryFilter('all');
  };

  const ResultCard = ({ item }) => {
    const icons = {
      message: MessageSquare,
      notice: Pin,
      document: FileText,
      event: CalendarIcon,
      task: ClipboardList
    };

    const Icon = icons[item.type];

    return (
      <Link 
        to={createPageUrl(`GroupDashboard?groupId=${item.groupId}`)} 
        onClick={onClose}
        className="block"
      >
        <div className="p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              item.type === 'message' ? 'bg-blue-100 text-blue-600' :
              item.type === 'notice' ? 'bg-orange-100 text-orange-600' :
              item.type === 'document' ? 'bg-green-100 text-green-600' :
              item.type === 'event' ? 'bg-purple-100 text-purple-600' :
              'bg-pink-100 text-pink-600'
            }`}>
              <Icon className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {item.type}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {item.groupName}
                </Badge>
              </div>
              
              <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">
                {item.title || item.message?.substring(0, 50)}
              </h3>
              
              {item.content && (
                <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                  {item.content}
                </p>
              )}
              
              {item.description && (
                <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                  {item.description}
                </p>
              )}
              
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {item.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(item.date, 'MMM d, yyyy HH:mm')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Search {currentGroup ? currentGroup.name : 'All Groups'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search messages, notices, documents, events, tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
              autoFocus
            />
          </div>

          {/* Filters */}
          {searchQuery && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600 font-medium">Filters:</span>
              </div>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              {allAuthors.length > 1 && (
                <Select value={authorFilter} onValueChange={setAuthorFilter}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="All Authors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Authors</SelectItem>
                    {allAuthors.map(author => (
                      <SelectItem key={author} value={author}>{author}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {allCategories.length > 1 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {allCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(dateFilter !== 'all' || authorFilter !== 'all' || categoryFilter !== 'all') && (
                <Button size="sm" variant="ghost" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Results */}
          {searchQuery ? (
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="all">
                    All ({allResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="messages">
                    Messages ({messageResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="notices">
                    Notices ({noticeResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="documents">
                    Docs ({documentResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="events">
                    Events ({eventResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="tasks">
                    Tasks ({taskResults.length})
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto mt-4">
                  <TabsContent value="all" className="mt-0 space-y-3">
                    {allResults.length > 0 ? (
                      allResults.map((item, idx) => (
                        <ResultCard key={idx} item={item} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Search className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No results found</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="messages" className="mt-0 space-y-3">
                    {messageResults.length > 0 ? (
                      messageResults.map((item, idx) => (
                        <ResultCard key={idx} item={item} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No messages found</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="notices" className="mt-0 space-y-3">
                    {noticeResults.length > 0 ? (
                      noticeResults.map((item, idx) => (
                        <ResultCard key={idx} item={item} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Pin className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No notices found</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="documents" className="mt-0 space-y-3">
                    {documentResults.length > 0 ? (
                      documentResults.map((item, idx) => (
                        <ResultCard key={idx} item={item} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No documents found</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="events" className="mt-0 space-y-3">
                    {eventResults.length > 0 ? (
                      eventResults.map((item, idx) => (
                        <ResultCard key={idx} item={item} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <CalendarIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No events found</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="tasks" className="mt-0 space-y-3">
                    {taskResults.length > 0 ? (
                      taskResults.map((item, idx) => (
                        <ResultCard key={idx} item={item} />
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No tasks found</p>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center py-12">
              <div>
                <Search className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Start Searching</h3>
                <p className="text-slate-500">Search across messages, notices, documents, events, and tasks</p>
                <div className="mt-4 text-sm text-slate-400">
                  <p>💡 Tips:</p>
                  <p>• Use filters to narrow results</p>
                  <p>• Search by author, date, or category</p>
                  <p>• Click any result to navigate to it</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}