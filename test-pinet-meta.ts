import handler from './api/main';
import { createServer } from 'http';

// Create a simple test server
const server = createServer(async (req: any, res: any) => {
  if (req.url === '/api/pinet/meta') {
    // Mock VercelRequest and VercelResponse objects
    const mockReq: any = {
      method: 'GET',
      query: { path: 'pinet/meta' },
      headers: {}
    };
    
    const mockRes: any = {
      setHeader: (name: string, value: string) => {
        console.log(`Setting header: ${name} = ${value}`);
      },
      status: (code: number) => {
        console.log(`Status: ${code}`);
        return mockRes;
      },
      json: (data: any) => {
        console.log('Response data:');
        console.log(JSON.stringify(data, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      },
      end: () => {
        res.end();
      },
      getHeader: () => {}
    };
    
    try {
      await handler(mockReq, mockRes);
    } catch (error) {
      console.error('Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}/api/pinet/meta`);
});