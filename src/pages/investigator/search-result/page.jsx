import React, { useState } from 'react';

const MOCK_CASES = [
  { id: "CAS-2024-001", suspect: "John Doe", type: "Theft", status: "Open", date: "2024-10-12", priority: "Medium" },
  { id: "CAS-2024-005", suspect: "Jane Smith", type: "Fraud", status: "Closed", date: "2024-09-28", priority: "High" },
  { id: "CAS-2024-012", suspect: "Robert Miller", type: "Burglary", status: "Pending", date: "2024-11-02", priority: "Low" },
  { id: "CAS-2024-019", suspect: "Sarah Connor", type: "Cybercrime", status: "Open", date: "2024-11-15", priority: "Critical" },
  { id: "CAS-2024-022", suspect: "Michael Scott", type: "Embezzlement", status: "Closed", date: "2024-08-14", priority: "Medium" }
];

const CaseSearch = () => {
  const [query, setQuery] = useState("");

  // HCI: Case-insensitive filtering for error prevention
  const filteredData = MOCK_CASES.filter(c => 
    c.id.toLowerCase().includes(query.toLowerCase()) || 
    c.suspect.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Case Management System</h1>
        <p style={{ color: '#666' }}>HCI Principle: Recognition over Recall (Clear ID display)</p>
        
        {/* Search Bar - High Contrast */}
        <input 
          type="text"
          placeholder="Search by Case ID or Suspect Name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '2px solid #e2e8f0',
            fontSize: '1rem',
            marginTop: '1rem'
          }}
        />
      </header>

      <main>
        {filteredData.length > 0 ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredData.map(caseFile => (
              <div key={caseFile.id} style={cardStyle}>
                <div>
                  <span style={idBadgeStyle}>{caseFile.id}</span>
                  <h3 style={{ margin: '8px 0' }}>Suspect: {caseFile.suspect}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#555' }}>Type: {caseFile.type} | Date: {caseFile.date}</p>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <span style={statusBadgeStyle(caseFile.status)}>{caseFile.status}</span>
                  <div style={{ marginTop: '10px' }}>
                    <button style={actionButtonStyle}>View Details</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
            <p>No cases found matching "{query}"</p>
            <button onClick={() => setQuery("")} style={{ color: '#007bff', border: 'none', background: 'none', cursor: 'pointer' }}>
              Clear Search
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

// --- HCI Styling Constants ---

const cardStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1.5rem',
  backgroundColor: '#fff',
  borderRadius: '12px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  border: '1px solid #edf2f7',
  transition: 'transform 0.2s' // HCI: Feedback on hover
};

const idBadgeStyle = {
  backgroundColor: '#ebf8ff',
  color: '#2b6cb0',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontWeight: 'bold'
};

const actionButtonStyle = {
  backgroundColor: '#2d3748',
  color: 'white',
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.85rem'
};

const statusBadgeStyle = (status) => ({
  padding: '4px 12px',
  borderRadius: '20px',
  fontSize: '0.8rem',
  fontWeight: 'bold',
  backgroundColor: status === 'Open' ? '#def7ec' : status === 'Closed' ? '#fde8e8' : '#fef3c7',
  color: status === 'Open' ? '#03543f' : status === 'Closed' ? '#9b1c1c' : '#92400e'
});

export default CaseSearch;