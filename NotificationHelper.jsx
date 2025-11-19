import { base44 } from "@/api/base44Client";

/**
 * Helper function to send notifications to users
 * Automatically handles both in-app and email notifications based on user preferences
 */
export async function sendNotification({
  userEmail,
  type,
  title,
  message,
  link = null,
  groupId = null,
  icon = 'default',
  sendEmail = false
}) {
  try {
    // Get the target user
    const users = await base44.entities.User.filter({ email: userEmail });
    if (users.length === 0) return;
    
    const targetUser = users[0];
    
    // Create in-app notification
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      link,
      group_id: groupId,
      icon,
      read: false,
      created_date: new Date().toISOString()
    };
    
    const existingNotifications = targetUser.notifications || [];
    const updatedNotifications = [notification, ...existingNotifications].slice(0, 50); // Keep last 50 notifications
    
    await base44.entities.User.update(targetUser.id, {
      notifications: updatedNotifications
    });
    
    // Send email if user has email notifications enabled and preference allows it
    const emailEnabled = targetUser.email_notifications_enabled;
    const preferences = targetUser.notification_preferences || {};
    const shouldSendEmail = emailEnabled && sendEmail && preferences[type];
    
    if (shouldSendEmail) {
      await base44.integrations.Core.SendEmail({
        to: userEmail,
        from_name: "Pro-Session",
        subject: `📬 ${title}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Pro-Session</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0; font-size: 12px;">Professional Development Platform</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #1e293b; margin-top: 0;">${title}</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">${message}</p>
              
              ${link ? `
                <div style="margin: 30px 0; text-align: center;">
                  <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    View Details
                  </a>
                </div>
              ` : ''}
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                You're receiving this email because you have email notifications enabled for ${type.replace(/_/g, ' ')}.
                <br>
                <a href="${process.env.APP_URL || 'https://your-app.base44.com'}/NotificationSettings" style="color: #667eea; text-decoration: none;">Manage notification settings</a>
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Pro-Session. All rights reserved.</p>
            </div>
          </div>
        `
      });
    }
    
    return { success: true, notification };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, error };
  }
}

/**
 * Send notification to multiple users
 */
export async function sendBulkNotifications({
  userEmails,
  type,
  title,
  message,
  link = null,
  groupId = null,
  icon = 'default',
  sendEmail = false
}) {
  const results = await Promise.all(
    userEmails.map(email => 
      sendNotification({ userEmail: email, type, title, message, link, groupId, icon, sendEmail })
    )
  );
  return results;
}

/**
 * Send notification to all group members
 */
export async function notifyGroupMembers({
  groupId,
  type,
  title,
  message,
  link = null,
  icon = 'group',
  sendEmail = false
}) {
  try {
    const groups = await base44.entities.Group.filter({ id: groupId });
    if (groups.length === 0) return { success: false, error: 'Group not found' };
    
    const group = groups[0];
    const memberEmails = (group.members || []).map(m => m.user_email);
    
    return await sendBulkNotifications({
      userEmails: memberEmails,
      type,
      title,
      message,
      link,
      groupId,
      icon,
      sendEmail
    });
  } catch (error) {
    console.error("Error notifying group members:", error);
    return { success: false, error };
  }
}

// Export predefined notification types for consistency
export const NotificationTypes = {
  NEW_POST: 'new_posts',
  NEW_EVENT: 'new_events',
  TASK_ASSIGNMENT: 'task_assignments',
  COURSE_UPDATE: 'course_updates',
  GROUP_ANNOUNCEMENT: 'group_announcements',
  PRIVATE_MESSAGE: 'private_messages',
  MEETING_REMINDER: 'meeting_reminders'
};

export const NotificationIcons = {
  MESSAGE: 'message',
  EVENT: 'event',
  GROUP: 'group',
  COURSE: 'course',
  TASK: 'task',
  ANNOUNCEMENT: 'announcement',
  DOCUMENT: 'document',
  EMAIL: 'email'
};