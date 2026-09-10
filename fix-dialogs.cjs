const fs = require('fs');

let dashboard = fs.readFileSync('client/src/pages/dashboard.tsx', 'utf8');

dashboard = dashboard.replace(
  'className="w-[95vw] sm:w-[92vw] h-[90vh] sm:h-auto max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-cyan-400/30 bg-slate-950 text-white shadow-2xl shadow-cyan-500/10 sm:max-w-4xl rounded-2xl flex flex-col"',
  'className="w-[95vw] sm:w-[92vw] h-[90dvh] sm:h-auto max-h-[95dvh] sm:max-h-[90vh] overflow-y-auto border border-cyan-400/30 bg-slate-950 text-white shadow-2xl shadow-cyan-500/10 sm:max-w-4xl rounded-2xl flex flex-col"'
);

dashboard = dashboard.replace(
  'className="sm:max-w-md bg-white rounded-xl shadow-2xl border-0"',
  'className="w-[95vw] sm:w-[90vw] sm:max-w-md bg-white rounded-xl shadow-2xl border-0"'
);

dashboard = dashboard.replace(
  'className="sm:max-w-[425px] bg-white rounded-xl shadow-2xl border-0"',
  'className="w-[95vw] sm:w-[90vw] sm:max-w-[425px] bg-white rounded-xl shadow-2xl border-0"'
);

dashboard = dashboard.replace(
  'className="w-full max-w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700"',
  'className="w-[95vw] sm:w-full max-w-full sm:max-w-md max-h-[90dvh] overflow-y-auto bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700"'
);

fs.writeFileSync('client/src/pages/dashboard.tsx', dashboard);
console.log('Dashboard updated.');
