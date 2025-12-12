import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Footer from '../components/Footer';
import PrintReceipt from '../components/PrintReceipt';
import { transactionAPI } from '../utils/api';
import { generateTransactionDocument } from '../utils/pdf';
import '../styles/transactions.css';

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const transactionIdParam = searchParams.get('id');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchId, setSearchId] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data } = await transactionAPI.getTransactions();
        setTransactions(data);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const filteredTransactions = (filter === 'all'
    ? transactions
    : transactions.filter(t => t.status === filter))
    .filter(t => {
      // If viewing specific transaction by ID, show only that one
      if (transactionIdParam) {
        return t._id === transactionIdParam;
      }
      return !searchId || t.transactionId.toLowerCase().includes(searchId.toLowerCase());
    });

  const getTypeIcon = (type) => {
    const icons = {
      transfer: '📤',
      withdrawal: '💵',
      topup: '📥',
      agent_deposit: '🏪'
    };
    return icons[type] || '💳';
  };

  const handleDownload = (tx) => {
    generateTransactionDocument(tx);
  };

  return (
    <>
    <div className="page-container">
      <div className="page-header">
        <h1>Transaction History</h1>
        <p>View all your transactions</p>
      </div>

      <div className="card">
        <div className="card-header flex-between">
          <h3>Transactions {filteredTransactions.length === 1 ? '(Transaction Details)' : `(${filteredTransactions.length})`}</h3>
          {!transactionIdParam && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search by Transaction ID..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Transactions</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          )}
        </div>

        <div className="card-body">
          {loading ? (
            <p className="text-center">Loading transactions...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center text-muted">No transactions found</p>
          ) : (
            <div className="transactions-list">
              {filteredTransactions.map(tx => (
                <div key={tx._id} className="transaction-item">
                  <div className="transaction-icon">
                    {getTypeIcon(tx.type)}
                  </div>
                  <div className="transaction-details">
                    <div>
                      <h4 className="transaction-title">
                        {tx.type === 'transfer' && `Sent to ${tx.receiver?.phone}`}
                        {tx.type === 'withdrawal' && 'Withdrawal Request'}
                        {tx.type === 'topup' && 'Account Topup'}
                        {tx.type === 'agent_deposit' && `Deposit from ${tx.sender?.phone}`}
                      </h4>
                      <p className="transaction-id">TX: {tx.transactionId}</p>
                      {(tx.senderLocation || tx.receiverLocation) && (
                        <p className="transaction-location" style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                          📍 {tx.senderLocation ? `From: ${tx.senderLocation.city}, ${tx.senderLocation.country}` : ''}
                          {tx.senderLocation && tx.receiverLocation && ' | '}
                          {tx.receiverLocation ? `To: ${tx.receiverLocation.city}, ${tx.receiverLocation.country}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="transaction-date">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="transaction-amount">
                    SSP {tx.amount.toFixed(2)}
                  </div>
                  <div className="transaction-status">
                    <span className={`badge badge-${
                      tx.status === 'completed' ? 'success' :
                      tx.status === 'pending' ? 'warning' :
                      'danger'
                    }`}>
                      {tx.status}
                    </span>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleDownload(tx)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: '#f0f0f0',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginLeft: '8px'
                      }}
                      title="Download transaction"
                    >
                      ⬇️
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setSelectedTransaction(tx)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: '#f0f0f0',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        marginLeft: '4px'
                      }}
                    >
                      🖨️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {selectedTransaction && (
        <PrintReceipt
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
    <Footer />
    </>
  );
}
