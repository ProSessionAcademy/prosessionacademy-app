/**
 * ✨ NOTIFICATION SYSTEM - USAGE EXAMPLES
 * 
 * This file shows how to use the notification system throughout the app.
 * Copy these examples wherever you need to send notifications!
 */

import { sendNotification, notifyGroupMembers, NotificationTypes, NotificationIcons } from "@/components/NotificationHelper";
import { createPageUrl } from "@/utils";

// ========================
// EXAMPLE 1: NEW POST IN GROUP
// ========================
export async function notifyNewPost(groupId, postTitle, authorName) {
  await notifyGroupMembers({
    groupId,
    type: NotificationTypes.NEW_POST,
    title: `📝 New Post: ${postTitle}`,
    message: `${authorName} posted something new in your group. Check it out!`,
    link: createPageUrl(`GroupDashboard?groupId=${groupId}&tab=community`),
    icon: NotificationIcons.MESSAGE,
    sendEmail: true // This will send email only if user enabled it in settings
  });
}

// ========================
// EXAMPLE 2: EVENT REMINDER
// ========================
export async function notifyEventReminder(groupId, eventTitle, eventDate) {
  await notifyGroupMembers({
    groupId,
    type: NotificationTypes.NEW_EVENT,
    title: `📅 Event Reminder: ${eventTitle}`,
    message: `Your event "${eventTitle}" starts on ${eventDate}. Don't forget to attend!`,
    link: createPageUrl(`GroupDashboard?groupId=${groupId}&tab=events`),
    icon: NotificationIcons.EVENT,
    sendEmail: true
  });
}

// ========================
// EXAMPLE 3: TASK ASSIGNMENT
// ========================
export async function notifyTaskAssignment(userEmail, taskTitle, groupId, assignedBy) {
  await sendNotification({
    userEmail,
    type: NotificationTypes.TASK_ASSIGNMENT,
    title: `✅ New Task Assigned`,
    message: `${assignedBy} assigned you a new task: "${taskTitle}"`,
    link: createPageUrl(`GroupDashboard?groupId=${groupId}&tab=tasks`),
    groupId,
    icon: NotificationIcons.TASK,
    sendEmail: true
  });
}

// ========================
// EXAMPLE 4: NEW COURSE CHAPTER
// ========================
export async function notifyCourseUpdate(userEmail, courseName, chapterTitle) {
  await sendNotification({
    userEmail,
    type: NotificationTypes.COURSE_UPDATE,
    title: `📚 New Chapter Available`,
    message: `A new chapter "${chapterTitle}" has been added to ${courseName}!`,
    link: createPageUrl(`Learning?courseId=...`),
    icon: NotificationIcons.COURSE,
    sendEmail: true
  });
}

// ========================
// EXAMPLE 5: GROUP ANNOUNCEMENT
// ========================
export async function notifyGroupAnnouncement(groupId, announcementTitle) {
  await notifyGroupMembers({
    groupId,
    type: NotificationTypes.GROUP_ANNOUNCEMENT,
    title: `📢 Important Announcement`,
    message: announcementTitle,
    link: createPageUrl(`GroupDashboard?groupId=${groupId}&tab=notice`),
    icon: NotificationIcons.ANNOUNCEMENT,
    sendEmail: true
  });
}

// ========================
// EXAMPLE 6: PRIVATE MESSAGE
// ========================
export async function notifyPrivateMessage(recipientEmail, senderName, groupId) {
  await sendNotification({
    userEmail: recipientEmail,
    type: NotificationTypes.PRIVATE_MESSAGE,
    title: `💬 New Message from ${senderName}`,
    message: `You have a new private message from ${senderName}. Click to view.`,
    link: createPageUrl(`GroupDashboard?groupId=${groupId}&tab=messages`),
    groupId,
    icon: NotificationIcons.EMAIL,
    sendEmail: true
  });
}

// ========================
// EXAMPLE 7: MEETING REMINDER (15 min before)
// ========================
export async function notifyMeetingReminder(groupId, meetingTitle, meetingTime) {
  await notifyGroupMembers({
    groupId,
    type: NotificationTypes.MEETING_REMINDER,
    title: `🎥 Meeting Starting Soon`,
    message: `"${meetingTitle}" starts in 15 minutes at ${meetingTime}`,
    link: createPageUrl(`GroupDashboard?groupId=${groupId}&tab=meetings`),
    icon: NotificationIcons.EVENT,
    sendEmail: true
  });
}

// ========================
// HOW TO USE IN YOUR COMPONENTS
// ========================

/**
 * Example: When creating a new post in GroupDashboard
 */
/*
const createPostMutation = useMutation({
  mutationFn: (data) => base44.entities.Post.create(data),
  onSuccess: async (newPost) => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    
    // 🔔 SEND NOTIFICATION TO GROUP MEMBERS
    await notifyNewPost(groupId, newPost.title, user.full_name);
    
    alert('✅ Post created and members notified!');
  },
});
*/

/**
 * Example: When assigning a task
 */
/*
const assignTask = async (taskData) => {
  const task = await base44.entities.Group.update(groupId, {
    tasks: [...existingTasks, taskData]
  });
  
  // 🔔 NOTIFY THE ASSIGNED USER
  await notifyTaskAssignment(
    taskData.assigned_to,
    taskData.title,
    groupId,
    user.full_name
  );
};
*/

/**
 * Example: When creating a group event
 */
/*
const createEventMutation = useMutation({
  mutationFn: (eventData) => {
    const updatedEvents = [...(group.group_events || []), eventData];
    return base44.entities.Group.update(groupId, { group_events: updatedEvents });
  },
  onSuccess: async (updatedGroup, eventData) => {
    queryClient.invalidateQueries({ queryKey: ['group'] });
    
    // 🔔 NOTIFY ALL GROUP MEMBERS
    await notifyGroupMembers({
      groupId,
      type: NotificationTypes.NEW_EVENT,
      title: `🎉 New Event: ${eventData.title}`,
      message: `A new event has been scheduled for ${eventData.date}`,
      link: createPageUrl(`GroupDashboard?groupId=${groupId}&tab=events`),
      icon: NotificationIcons.EVENT,
      sendEmail: true
    });
    
    alert('✅ Event created and notifications sent!');
  },
});
*/