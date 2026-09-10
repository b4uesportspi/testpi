import React from 'react';

interface ErrorProps {
  statusCode?: number;
  error?: Error;
}

function Error({ statusCode, error }: ErrorProps) {
  // Log the error for debugging
  if (error) {
    console.error('Dashboard Error Boundary:', error);
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '40px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{
          color: '#e74c3c',
          marginBottom: '20px',
          fontSize: '2em'
        }}>
          Oops! Something went wrong
        </h1>

        <p style={{
          color: '#666',
          marginBottom: '20px',
          lineHeight: '1.6'
        }}>
          We're sorry, but the dashboard encountered an unexpected error.
          This might be due to a temporary issue with our servers or your connection.
        </p>

        {statusCode && (
          <p style={{
            color: '#999',
            fontSize: '0.9em',
            marginBottom: '20px'
          }}>
            Error Code: {statusCode}
          </p>
        )}

        <div style={{ marginTop: '30px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '10px'
            }}
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.href = '/'}
            style={{
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Go Home
          </button>
        </div>

        <details style={{ marginTop: '20px', textAlign: 'left' }}>
          <summary style={{
            cursor: 'pointer',
            color: '#666',
            fontSize: '0.9em'
          }}>
            Technical Details (for developers)
          </summary>
          <pre style={{
            backgroundColor: '#f8f8f8',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '0.8em',
            marginTop: '10px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap'
          }}>
            {error?.stack || 'No additional error details available'}
          </pre>
        </details>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode?: number }; err?: (Error & { statusCode?: number }) | null }) => {
  const statusCode = res?.statusCode || err?.statusCode || 500;
  return { statusCode, error: err };
};

export default Error;
