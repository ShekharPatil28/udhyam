import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// Simple local API URL
const API_BASE_URL = 'http://localhost:5000/api';

const formSchema = {
  steps: [
    {
      step: 1, title: "Aadhaar Verification with OTP",
      fields: [
        { id: "aadhaar", name: "aadhaar", type: "text", placeholder: "Enter 12-digit Aadhaar Number", required: true, maxLength: 12, pattern: "^[0-9]{12}$", label: "Aadhaar Number/ आधार संख्या" },
        { id: "otp", name: "otp", type: "text", placeholder: "Enter OTP", required: true, maxLength: 6, pattern: "^[0-9]{6}$", label: "OTP" }
      ]
    },
    {
      step: 2, title: "PAN Validation",
      fields: [
        { id: "pan", name: "pan", type: "text", placeholder: "Enter PAN Number", required: true, maxLength: 10, pattern: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$", label: "PAN Number" },
        { id: "pincode", name: "pincode", type: "text", placeholder: "Enter PIN Code", required: true, maxLength: 6, pattern: "^[0-9]{6}$", label: "PIN Code" },
        { id: "city", name: "city", type: "text", placeholder: "City (auto-filled)", required: true, readonly: true, label: "City" },
        { id: "state", name: "state", type: "text", placeholder: "State (auto-filled)", required: true, readonly: true, label: "State" }
      ]
    }
  ]
};

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);

  const validateField = (field, value) => {
    if (field.required && !value) return `${field.label} is required`;
    if (field.pattern && value && !new RegExp(field.pattern).test(value)) {
      const messages = { 
        aadhaar: 'Enter valid 12-digit Aadhaar', 
        pan: 'Enter valid PAN (ABCDE1234F)', 
        otp: 'Enter valid 6-digit OTP', 
        pincode: 'Enter valid 6-digit PIN' 
      };
      return messages[field.name] || 'Invalid format';
    }
    return null;
  };

  const handlePincodeChange = async (value) => {
    setFormData(prev => ({ ...prev, pincode: value, city: '', state: '' }));
    if (value.length === 6 && /^[0-9]{6}$/.test(value)) {
      setPincodeLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/pincode/${value}`);
        if (response.data.success) {
          setFormData(prev => ({ 
            ...prev, 
            city: response.data.data.city, 
            state: response.data.data.state 
          }));
          setErrors(prev => ({ ...prev, pincode: null, city: null, state: null }));
        }
      } catch (error) {
        setErrors(prev => ({ 
          ...prev, 
          pincode: 'Invalid PIN code or unable to fetch location data' 
        }));
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleInputChange = (field, value) => {
    if (field.name === 'pincode') { 
      handlePincodeChange(value); 
      return; 
    }
    
    setFormData(prev => ({ 
      ...prev, 
      [field.name]: field.name === 'pan' ? value.toUpperCase() : value 
    }));
    
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field.name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const currentStepData = formSchema.steps.find(s => s.step === currentStep);
    
    const stepErrors = {};
    currentStepData.fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) stepErrors[field.name] = error;
    });

    if (Object.keys(stepErrors).length > 0) { 
      setErrors(stepErrors); 
      setLoading(false); 
      return; 
    }

    try {
      let response;
      if (currentStep === 1) {
        response = await axios.post(`${API_BASE_URL}/validate-step1`, { 
          aadhaar: formData.aadhaar, 
          otp: formData.otp 
        });
      } else if (currentStep === 2) {
        response = await axios.post(`${API_BASE_URL}/validate-step2`, { 
          pan: formData.pan, 
          pincode: formData.pincode, 
          city: formData.city, 
          state: formData.state, 
          submissionId: Date.now() 
        });
      }

      if (response.data.success) {
        setCompletedSteps(prev => [...prev, currentStep]);
        if (currentStep < 2) {
          setCurrentStep(currentStep + 1); 
        } else {
          setIsCompleted(true);
        }
        setErrors({});
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => { 
    setCurrentStep(1); 
    setFormData({}); 
    setErrors({}); 
    setCompletedSteps([]); 
    setIsCompleted(false); 
  };

  if (isCompleted) {
    return (
      <div className="app">
        <header className="gov-header">
          <div className="gov-header-top">Ministry of Micro, Small and Medium Enterprises, Government of India</div>
          <div className="gov-header-main">
            <div className="gov-logo">🏛️</div>
            <div className="gov-title">
              <h1>Udyam Registration</h1>
              <div className="gov-subtitle">For New Enterprises who are not Registered yet as MSME</div>
            </div>
          </div>
        </header>
        <div className="container">
          <div className="content-area">
            <main className="main-content">
              <div className="form-header"><h2>Registration Completed Successfully!</h2></div>
              <div className="form-content">
                <div className="success-screen">
                  <div className="success-icon">✅</div>
                  <h2 className="success-title">Udyam Registration Successful</h2>
                  <div className="success-details">
                    <div className="detail-row"><span className="detail-label">Aadhaar:</span><span>{formData.aadhaar}</span></div>
                    <div className="detail-row"><span className="detail-label">PAN:</span><span>{formData.pan}</span></div>
                    <div className="detail-row"><span className="detail-label">Location:</span><span>{formData.city}, {formData.state}</span></div>
                    <div className="detail-row"><span className="detail-label">PIN Code:</span><span>{formData.pincode}</span></div>
                  </div>
                  <div className="form-actions"><button className="btn btn-primary" onClick={resetForm}>Register New Application</button></div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  const currentStepData = formSchema.steps.find(s => s.step === currentStep);

  return (
    <div className="app">
      <header className="gov-header">
        <div className="gov-header-top">Ministry of Micro, Small and Medium Enterprises, Government of India</div>
        <div className="gov-header-main">
          <div className="gov-logo">🏛️</div>
          <div className="gov-title">
            <h1>Udyam Registration</h1>
            <div className="gov-subtitle">For New Enterprises who are not Registered yet as MSME</div>
          </div>
        </div>
      </header>

      <nav className="nav-bar">
        <ul className="nav-links">
          <li><a href="#" className="active">Home</a></li>
          <li><a href="#">NIC Code</a></li>
          <li><a href="#">Print / Verify</a></li>
          <li><a href="#">Login</a></li>
        </ul>
      </nav>

      <div className="container">
        <div className="content-area">
          <aside className="sidebar">
            <h3>Registration Guide</h3>
            <div className="info-box">
              <h4>Required Documents</h4>
              <ul className="info-list">
                <li>Aadhaar Card</li><li>PAN Card</li><li>Business Address</li><li>Bank Details</li>
              </ul>
            </div>
            <div className="info-box">
              <h4>Important Notes</h4>
              <ul className="info-list">
                <li>OTP sent to registered mobile</li><li>All * fields are mandatory</li><li>PAN should be uppercase</li>
              </ul>
            </div>
          </aside>

          <main className="main-content">
            <div className="form-header">
              <h2>UDYAM REGISTRATION FORM</h2>
              <div className="form-subtitle">For New Enterprise who are not Registered yet as MSME</div>
            </div>

            <div className="progress-container">
              <div className="steps-tracker">
                {formSchema.steps.map(step => (
                  <div key={step.step} className={`step-item ${currentStep >= step.step ? 'active' : ''} ${completedSteps.includes(step.step) ? 'completed' : ''}`}>
                    <div className="step-circle">{completedSteps.includes(step.step) ? '✓' : step.step}</div>
                    <div className="step-label">{step.title}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-content">
              <h3 className="form-section-title">{currentStepData.title}</h3>
              
              {errors.general && (
                <div className="error-message general-error">
                  ⚠️ {errors.general}
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  {currentStepData.fields.map(field => (
                    <div key={field.id} className={`form-group ${field.name === 'aadhaar' ? 'full-width' : ''}`}>
                      <label className={`form-label ${field.required ? 'required-field' : ''}`}>{field.label}</label>
                      <div className="input-group">
                        <input
                          type={field.type} id={field.id} placeholder={field.placeholder} maxLength={field.maxLength}
                          value={formData[field.name] || ''} onChange={(e) => handleInputChange(field, e.target.value)}
                          className={`form-input ${errors[field.name] ? 'error' : ''} ${!errors[field.name] && formData[field.name] && !validateField(field, formData[field.name]) ? 'success' : ''}`}
                          disabled={loading || field.readonly} readOnly={field.readonly}
                        />
                        {field.name === 'pincode' && pincodeLoading && <div className="input-icon"><div className="spinner"></div></div>}
                      </div>
                      {errors[field.name] && <div className="error-message">⚠️ {errors[field.name]}</div>}
                      {!errors[field.name] && formData[field.name] && !validateField(field, formData[field.name]) && (
                        <div className="success-message"> {field.name === 'pincode' && formData.city ? `Found: ${formData.city}, ${formData.state}` : 'Valid'}</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="form-actions">
                  {currentStep > 1 ? <button type="button" onClick={() => setCurrentStep(currentStep - 1)} className="btn btn-secondary" disabled={loading}>← Previous</button> : <div></div>}
                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? <><div className="spinner"></div>Processing...</> : (currentStep === 2 ? 'Submit Registration →' : 'Next Step →')}
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
