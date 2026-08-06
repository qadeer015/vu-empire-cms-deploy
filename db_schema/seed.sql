-- =====================================================
-- Seed data for VU Ad Server
-- =====================================================

-- ----- Ad Zones (if not already inserted) -----
INSERT IGNORE INTO ad_zones (id, name, width, height, supports_video) VALUES
(1, 'popup_bottom', 728, 90, 0),
(2, 'quiz_panel', 300, 250, 1),
(3, 'sidebar', 160, 600, 0);

-- ----- Campaigns -----
INSERT INTO ad_campaigns (name, advertiser, budget, spent, start_date, end_date, status) VALUES
('Spring Sale 2025', 'Tech Academy', 500.00, 0.00, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_ADD(NOW(), INTERVAL 25 DAY), 'active'),
('VU Exam Prep', 'StudyHub', 300.00, 0.00, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 10 DAY), 'active'),
('Video Campaign', 'StreamEd', 1000.00, 0.00, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY), 'active'),
('Draft Campaign', 'Test Advertiser', 100.00, 0.00, NOW(), NULL, 'draft'),
('Paused Campaign', 'Old Promo', 200.00, 0.00, DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY), 'paused'),
('Expired Campaign', 'Past Event', 50.00, 50.00, DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'ended');

-- ----- Creatives -----
-- Image creative (zone 1, popup_bottom)
INSERT INTO ad_creatives (campaign_id, zone_id, type, title, description, image_url, destination_url, cpc_rate, cpm_rate, priority, is_active) VALUES
(1, 1, 'image', 'Spring Sale Banner', 'Get 30% off all courses', 'https://picsum.photos/728/90?random=10', 'https://example.com/spring-sale', 0.50, 5.00, 10, 1);

-- Second image creative with higher priority (zone 1)
INSERT INTO ad_creatives (campaign_id, zone_id, type, title, description, image_url, destination_url, cpc_rate, cpm_rate, priority, is_active) VALUES
(2, 1, 'image', 'Exam Prep Flash Sale', '50% off study guides', 'https://picsum.photos/728/90?random=11', 'https://example.com/exam-prep', 0.75, 7.00, 20, 1);

-- Video creative (zone 2, quiz_panel)
INSERT INTO ad_creatives (campaign_id, zone_id, type, title, description, image_url, video_url, destination_url, cpc_rate, cpm_rate, priority, is_active) VALUES
(3, 2, 'video', 'Learn with Videos', 'Watch our free tutorial', 'https://picsum.photos/300/250?random=20', 'https://www.w3schools.com/html/mov_bbb.mp4', 'https://example.com/video-course', 0.40, 8.00, 15, 1);

-- Text creative (zone 3, sidebar)
INSERT INTO ad_creatives (campaign_id, zone_id, type, title, description, destination_url, cpc_rate, cpm_rate, priority, is_active) VALUES
(1, 3, 'text', 'Limited Time Offer', 'Join our AI bootcamp – only $99', 'https://example.com/bootcamp', 0.30, 3.00, 5, 1);

-- HTML creative (zone 2, quiz_panel)
INSERT INTO ad_creatives (campaign_id, zone_id, type, html_code, destination_url, cpc_rate, cpm_rate, priority, is_active) VALUES
(2, 2, 'html', '<div style="background:#f0f0f0; padding:10px; text-align:center;"><strong>🔥 Exam Cram 🔥</strong><br>Free past papers<br><button style="background:green; color:white;">Get Now</button></div>', 'https://example.com/pastpapers', 0.60, 6.00, 8, 1);

-- ----- Targeting Rules -----
-- For creative_id 1 (Spring Sale) – target only CS101 and CS201 courses
INSERT INTO ad_targeting (creative_id, rule_type, rule_value, operator) VALUES
(1, 'course_code', 'CS101', 'equals'),
(1, 'course_code', 'CS201', 'equals');

-- For creative_id 2 (Exam Prep) – target quiz pages only
INSERT INTO ad_targeting (creative_id, rule_type, rule_value, operator) VALUES
(2, 'page_url', 'Quiz.aspx', 'contains');

-- For creative_id 3 (Video creative) – target any page, no restriction (no targeting row means always eligible)
-- For creative_id 4 (Text) – target specific user segment 'premium'
INSERT INTO ad_targeting (creative_id, rule_type, rule_value, operator) VALUES
(4, 'user_segment', 'premium', 'equals');

-- For creative_id 5 (HTML) – target extension version 1.0 and above
INSERT INTO ad_targeting (creative_id, rule_type, rule_value, operator) VALUES
(5, 'extension_version', '1.0', 'version_gte');

-- ----- Optional: Insert some frequency cap demo data (not necessary for first run) -----
-- The frequency table will be populated automatically as impressions/clicks happen.

-- =====================================================
-- End of seed
-- =====================================================