-- Query to check who purchased what today
SELECT 
  u.email as "User Email",
  u.display_name as "Display Name",
  p.name as "Package",
  t.pi_amount as "π Amount",
  t.usd_amount as "USD Amount",
  t.status as "Status",
  t.created_at as "Purchase Time"
FROM app_transactions t
JOIN app_users u ON t.user_id = u.id
LEFT JOIN app_packages p ON t.package_id = p.id
WHERE DATE(t.created_at) = CURRENT_DATE
ORDER BY t.created_at DESC;

-- Alternative: Summary of today's purchases by status
SELECT 
  COUNT(*) as "Total Purchases",
  SUM(CAST(t.usd_amount AS DECIMAL)) as "Total Revenue (USD)",
  SUM(CAST(t.pi_amount AS DECIMAL)) as "Total π Amount",
  t.status as "Status"
FROM app_transactions t
WHERE DATE(t.created_at) = CURRENT_DATE
GROUP BY t.status
ORDER BY t.status;
