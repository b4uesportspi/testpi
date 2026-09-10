const fs = require('fs');

let dashboard = fs.readFileSync('client/src/pages/dashboard.tsx', 'utf8');

// 1. Add state for notification sheet
if (!dashboard.includes('isNotificationsOpen')) {
  dashboard = dashboard.replace('const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);', 
    'const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);\n  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);');
}

// 2. Add useQuery for notifications
if (!dashboard.includes('const { data: notifications')) {
  const queryStr = `
  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 5000,
  });

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(\`/api/notifications/\${id}/read\`, {
        method: 'POST',
        headers: { Authorization: \`Bearer \${token}\` }
      });
      refetchNotifications();
    } catch (e) { console.error(e); }
  };
  `;
  dashboard = dashboard.replace('const { data: piPrice } = usePiPrice();', 'const { data: piPrice } = usePiPrice();\n' + queryStr);
}

// 3. Update Bell Icon logic
const bellTarget = `              <button 
                className="relative p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-800" 
                onClick={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); }}
              >
                <i className="fas fa-bell text-lg"></i>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
              </button>`;
const bellReplacement = `              <button 
                className="relative p-2 text-gray-300 hover:text-white transition-colors rounded-full hover:bg-gray-800" 
                onClick={() => { 
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); 
                  setIsNotificationsOpen(true);
                }}
              >
                <i className="fas fa-bell text-lg"></i>
                {notifications?.some((n: any) => n.status === 'unread') && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
                )}
              </button>`;
dashboard = dashboard.replace(bellTarget, bellReplacement);

// 4. Add Notification Sheet at the end
const sheetTarget = `</Dialog>
    </div>
  );
}`;
const sheetReplacement = `</Dialog>

      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-md h-[90dvh] max-h-[95dvh] bg-gray-900 border border-gray-800 rounded-xl shadow-2xl flex flex-col p-0">
          <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fas fa-bell text-blue-400"></i> Notifications
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications?.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <i className="fas fa-inbox text-4xl mb-3 opacity-20"></i>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications?.map((notification: any) => (
                <div 
                  key={notification.id} 
                  className={\`p-4 rounded-xl border \${notification.status === 'unread' ? 'bg-blue-900/20 border-blue-500/30' : 'bg-gray-800/40 border-gray-700/50'}\`}
                  onClick={() => {
                    if (notification.status === 'unread') markNotificationRead(notification.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={\`mt-1 w-2 h-2 rounded-full flex-shrink-0 \${notification.status === 'unread' ? 'bg-blue-400' : 'bg-gray-600'}\`}></div>
                    <div>
                      <h4 className={\`text-sm font-bold \${notification.status === 'unread' ? 'text-white' : 'text-gray-300'}\`}>{notification.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                      <p className="text-[10px] text-gray-500 mt-2">{new Date(notification.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}`;
dashboard = dashboard.replace(sheetTarget, sheetReplacement);

fs.writeFileSync('client/src/pages/dashboard.tsx', dashboard);
console.log('Frontend logic added');
