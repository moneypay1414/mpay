import { useState, useEffect } from 'react';
import { adminAPI } from '../utils/api';
import Toast from '../components/Toast';
import Footer from '../components/Footer';
import '../styles/withdraw.css';

export default function AdminTieredCommission() {
  const [sendTiers, setSendTiers] = useState([]);
  const [withdrawalTiers, setWithdrawalTiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const { data } = await adminAPI.getTieredCommission();
        setSendTiers(data.tiers || []);
        setWithdrawalTiers(data.withdrawalTiers || []);
      } catch (err) {
        console.error('Failed to load tiered commission', err);
        setMessage('Failed to load tiered commission settings');
      }
    };
    fetchTiers();
  }, []);

  const handleTierChange = (index, field, value, tierType = 'send') => {
    const tiers = tierType === 'send' ? sendTiers : withdrawalTiers;
    const setTiers = tierType === 'send' ? setSendTiers : setWithdrawalTiers;
    
    const newTiers = [...tiers];
    newTiers[index] = {
      ...newTiers[index],
      [field]: (field === 'minAmount' || field === 'agentPercent' || field === 'companyPercent') 
        ? parseFloat(value) || 0 
        : parseFloat(value) || 0
    };
    setTiers(newTiers);
  };

  const addTier = (tierType = 'send') => {
    if (tierType === 'send') {
      setSendTiers([...sendTiers, { minAmount: 0, companyPercent: 0 }]);
    } else {
      setWithdrawalTiers([...withdrawalTiers, { minAmount: 0, agentPercent: 0, companyPercent: 0 }]);
    }
  };

  const removeTier = (index, tierType = 'send') => {
    if (tierType === 'send') {
      setSendTiers(sendTiers.filter((_, i) => i !== index));
    } else {
      setWithdrawalTiers(withdrawalTiers.filter((_, i) => i !== index));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Validate send tiers
      for (const tier of sendTiers) {
        if (isNaN(tier.minAmount) || tier.minAmount < 0) {
          setMessage('All send tier minimum amounts must be valid numbers >= 0');
          setLoading(false);
          return;
        }
        if (isNaN(tier.companyPercent) || tier.companyPercent < 0 || tier.companyPercent > 100) {
          setMessage('All send tier company commission percentages must be between 0 and 100');
          setLoading(false);
          return;
        }
      }

      // Validate withdrawal tiers
      for (const tier of withdrawalTiers) {
        if (isNaN(tier.minAmount) || tier.minAmount < 0) {
          setMessage('All withdrawal tier minimum amounts must be valid numbers >= 0');
          setLoading(false);
          return;
        }
        if (isNaN(tier.agentPercent) || tier.agentPercent < 0 || tier.agentPercent > 100) {
          setMessage('All withdrawal tier agent commission percentages must be between 0 and 100');
          setLoading(false);
          return;
        }
        if (isNaN(tier.companyPercent) || tier.companyPercent < 0 || tier.companyPercent > 100) {
          setMessage('All withdrawal tier company commission percentages must be between 0 and 100');
          setLoading(false);
          return;
        }
      }

      const { data } = await adminAPI.setTieredCommission({ 
        tiers: sendTiers,
        withdrawalTiers 
      });
      setMessage('Tiered commission settings saved successfully!');
      setToastMessage('Tiered commission updated');
      setToastType('success');
      setSendTiers(data.tiers);
      setWithdrawalTiers(data.withdrawalTiers);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to save tiered commission');
      setToastMessage('Failed to save settings');
      setToastType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="page-container">
      <div className="page-header">
        <h1>💰 Tiered Commission Settings</h1>
        <p>Configure commission percentages based on transaction amounts for send-money</p>
      </div>

      {message && (
        <div className={`alert ${message.includes('Failed') ? 'alert-danger' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Send Money Commission Tiers</h3>
          <p className="text-muted">Set different commission percentages for different transaction amounts</p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSave}>
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table className="table" style={{ minWidth: '500px' }}>
                <thead>
                  <tr>
                    <th>Minimum Amount (SSP)</th>
                    <th>Company Commission (%)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sendTiers.map((tier, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={tier.minAmount}
                          onChange={(e) => handleTierChange(index, 'minAmount', e.target.value, 'send')}
                          style={{ width: '100%', padding: '8px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={tier.companyPercent || 0}
                          onChange={(e) => handleTierChange(index, 'companyPercent', e.target.value, 'send')}
                          style={{ width: '100%', padding: '8px' }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-delete"
                          onClick={() => removeTier(index, 'send')}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '30px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => addTier('send')}
                style={{ padding: '8px 16px' }}
              >
                + Add Send Tier
              </button>
            </div>

            <div className="card" style={{ marginTop: '30px', marginBottom: '30px' }}>
              <div className="card-header">
                <h3>Withdrawal Commission Tiers</h3>
                <p className="text-muted">Set different commission percentages for withdrawal transaction amounts</p>
              </div>
              <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                <table className="table" style={{ minWidth: '600px' }}>
                  <thead>
                    <tr>
                      <th>Minimum Amount (SSP)</th>
                      <th>Agent Commission (%)</th>
                      <th>Company Commission (%)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalTiers.map((tier, index) => (
                      <tr key={index}>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={tier.minAmount}
                            onChange={(e) => handleTierChange(index, 'minAmount', e.target.value, 'withdrawal')}
                            style={{ width: '100%', padding: '8px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={tier.agentPercent || 0}
                            onChange={(e) => handleTierChange(index, 'agentPercent', e.target.value, 'withdrawal')}
                            style={{ width: '100%', padding: '8px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={tier.companyPercent || 0}
                            onChange={(e) => handleTierChange(index, 'companyPercent', e.target.value, 'withdrawal')}
                            style={{ width: '100%', padding: '8px' }}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-delete"
                            onClick={() => removeTier(index, 'withdrawal')}
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => addTier('withdrawal')}
                  style={{ padding: '8px 16px' }}
                >
                  + Add Withdrawal Tier
                </button>
              </div>
            </div>

            <div className="form-group">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || (sendTiers.length === 0 && withdrawalTiers.length === 0)}
                style={{ width: '100%' }}
              >
                {loading ? 'Saving...' : 'Save Tiered Commission'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-header">
          <h3>📋 How It Works</h3>
        </div>
        <div className="card-body">
          <p>
            When a user sends money, the system calculates the commission based on the transaction amount and the tiers you define.
            The system finds the highest tier whose minimum amount is <strong>less than or equal to</strong> the transaction amount.
          </p>
          <p style={{ marginTop: '10px' }}>
            <strong>Example:</strong> If you set:
          </p>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>From 100 SSP: 1% commission</li>
            <li>From 200 SSP: 2% commission</li>
            <li>From 500 SSP: 5% commission</li>
          </ul>
          <p style={{ marginTop: '10px' }}>
            A 150 SSP transfer would use the 1% tier (lowest tier ≥ 150).<br />
            A 500 SSP transfer would use the 5% tier (lowest tier ≥ 500).
          </p>
        </div>
      </div>
    </div>
    <Footer />
    <Toast 
      message={toastMessage} 
      type={toastType} 
      onClose={() => setToastMessage('')} 
    />
    </>
  );
}
