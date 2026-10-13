-- 只读预检查。先在确认的目标库核验存量与排序语义；本文件不添加索引、不改用户名。
SELECT DATABASE() AS database_name;
SHOW FULL COLUMNS FROM users LIKE 'name';

SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- 仅返回数量与名称摘要，不输出账号邮箱、密码或原始 UserID。
SELECT COUNT(*) AS duplicate_groups, COALESCE(SUM(group_size), 0) AS affected_rows
FROM (
  SELECT COUNT(*) AS group_size
  FROM users
  WHERE name IS NOT NULL
  GROUP BY LOWER(TRIM(name))
  HAVING COUNT(*) > 1
) AS duplicates;

SELECT SHA2(LOWER(TRIM(name)), 256) AS name_digest, COUNT(*) AS group_size
FROM users
WHERE name IS NOT NULL
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1;

SELECT COUNT(*) AS legacy_invalid_names
FROM users
WHERE name IS NULL OR LOWER(TRIM(name)) NOT REGEXP '^[a-z0-9][a-z0-9._-]{1,16}[a-z0-9]$';
