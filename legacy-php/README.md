HabitFlow — Premium Habit Tracking System

**HabitFlow** is a modern, high-performance web application designed to help users build and maintain life-changing habits through a minimalist, distraction-free interface. This system was developed as a final project for the 4th semester, focusing on architectural efficiency, professional design, and secure backend logic.



Project Concept
- **The Problem:** In an age of digital distraction, people struggle to stay consistent with personal goals. Most habit trackers are either too cluttered or lack visual feedback.
- **The Solution:** **HabitFlow** provides a "Zero-Clutter" environment with a strong visual feedback loop through Radar charts, Bar graphs, and a 31-day productivity grid.


System Features

User Features
- **Interactive Dashboard:** Quick-access checklist to mark habits as completed.
- **Habit Management:** Create, Edit, and Delete personal habits with custom icons and colors.
- **Streaks & Progress:** Automatic calculation of current streaks and total completion metrics.
- **Visual Analytics:** View 30-day completion bar charts and "Day-of-Week" radar patterns.
- **Monthly Grid:** An Excel-style overview of the entire month's productivity at a glance.
- **Secure Profile:** Manage personal details and change account settings.

Admin Features
- **Centralized Management:** Add, Enable, Disable, or Delete any user in the system.
- **Global Overview:** High-level statistics of total users, active habits, and system-wide check-ins.
- **Role Control:** Promote regular users to "Admin" status or demote them.
- **Secure Logging:** Track user activity and status through a professional administrative table.



Technical Implementation & Data Flow

1. The Authentication Engine
- **Logic:** Uses PHPs standard session management. Passwords are never saved in plain text; they are encrypted using the **Bcrypt** algorithm.
- **Validation:** Every input is passed through a sanitization layer to prevent XSS.

2. Data Visualization (Charts)
- **Flow:** PHP gathers raw log counts (`SQL COUNT`) -> Data is JSON encoded -> JavaScript (Chart.js) renders the data on a canvas.
- **Innovation:** The radar chart visualizes the "Day-of-Week" pattern, helping users identify which days they are most/least productive.

3. The Grid Logic
- The 31-day monthly grid uses a **Nested Loop Technique**:
   - For every habit (Row)
     - Iterate 1 to 31 (Cells)
       - Check if a log entry exists for that specific Date.



Security Summary (For Viva/Submission)
1. **PDO Prepared Statements:** Complete protection against SQL Injection.
2. **CSRF Protection:** Tokens ensure that forms cannot be submitted from outside the app.
3. **Session Hardening:** Uses secure session cookies to prevent hijacking.
4. **Zero-Config Portability:** Dynamic URL detection allows the app to run on any computer instantly.



Future Enhancements
- **Mobile Push Notifications:** To remind users about pending habits.
- **Social Sharing:** Allow users to share their "Monthly Grid" streaks on social media.
- **AI Analytics:** Use machine learning to suggest optimal habits based on user patterns.
- **Team Challenges:** Group habit tracking for friends or corporate teams.


