with open('c:\\B4U Esports\\client\\src\\pages\\dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the incorrect line with the correct formatting
content = content.replace('}export default Dashboard;', '}\nexport default Dashboard;')

with open('c:\\B4U Esports\\client\\src\\pages\\dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)