/***/
-- subscription_plans
-- api_keys
-- api_key_usage_logs
-- api_key_bindings
-- payments
/***/

CREATE TABLE subscription_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    duration_days INT NOT NULL,
    
    -- feature flags
    can_solve_quiz BOOLEAN DEFAULT FALSE,
    can_solve_gdb BOOLEAN DEFAULT FALSE,
    can_export_pdf BOOLEAN DEFAULT FALSE,

    -- usage limits
    monthly_request_limit INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_keys (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    key_hash CHAR(64) NOT NULL UNIQUE,   -- SHA256 of real key
    key_prefix VARCHAR(20) NOT NULL,     -- e.g. vu_live_
    
    plan_id INT NOT NULL,
    
    status ENUM('active','expired','revoked') DEFAULT 'active',
    
    expires_at DATETIME NOT NULL,
    
    monthly_usage INT DEFAULT 0,
    last_reset_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    first_used_at DATETIME NULL,
    last_used_at DATETIME NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE TABLE api_key_usage_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    api_key_id BIGINT NOT NULL,
    
    endpoint VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

CREATE TABLE api_key_bindings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    api_key_id BIGINT NOT NULL,
    
    extension_id VARCHAR(100),
    first_ip VARCHAR(45),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

CREATE TABLE payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    api_key_id BIGINT,
    
    provider VARCHAR(50),  -- stripe, paddle etc
    provider_payment_id VARCHAR(100),
    
    amount DECIMAL(10,2),
    currency VARCHAR(10),
    
    status ENUM('pending','completed','failed'),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);