with open('c:\\B4U Esports\\client\\src\\pages\\dashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Write back all lines except the duplicate export statement
with open('c:\\B4U Esports\\client\\src\\pages\\dashboard.tsx', 'w', encoding='utf-8') as f:
    for line in lines:
        if line.strip() != 'export default Dashboard;':
            f.write(line)