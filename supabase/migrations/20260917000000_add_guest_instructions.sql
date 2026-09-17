-- Guest Instructions is a new admin task on the To Do screen, tracked the
-- same way as Police Registration (task_status enum, no date/file needed).
ALTER TABLE bookings ADD COLUMN guest_instructions task_status DEFAULT 'TO BE DONE';
