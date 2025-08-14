const express = require('express');
const cors = require('cors');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 5000;

// Simple CORS for local development
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Validation rules
const validations = {
  aadhaar: body('aadhaar').matches(/^[0-9]{12}$/).withMessage('Aadhaar must be 12 digits'),
  otp: body('otp').matches(/^[0-9]{6}$/).withMessage('OTP must be 6 digits'),
  pan: body('pan').matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN format')
};

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend server is working!', 
    timestamp: new Date()
  });
});

// Form schema route
app.get('/api/form-schema', (req, res) => {
  const schema = {
    steps: [
      {
        step: 1,
        title: "Aadhaar Number & OTP Validation",
        fields: [
          {
            id: "aadhaar", name: "aadhaar", type: "text",
            placeholder: "Enter 12-digit Aadhaar Number",
            required: true, maxLength: 12, pattern: "^[0-9]{12}$",
            label: "Aadhaar Number"
          },
          {
            id: "otp", name: "otp", type: "text",
            placeholder: "Enter OTP", required: true,
            maxLength: 6, pattern: "^[0-9]{6}$", label: "OTP"
          }
        ]
      },
      {
        step: 2,
        title: "Business Details & PAN Validation",
        fields: [
          {
            id: "pan", name: "pan", type: "text",
            placeholder: "Enter PAN Number (e.g., ABCDE1234F)",
            required: true, maxLength: 10,
            pattern: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$", label: "PAN Number"
          },
          {
            id: "pincode", name: "pincode", type: "text",
            placeholder: "Enter PIN Code", required: true,
            maxLength: 6, pattern: "^[0-9]{6}$", label: "PIN Code"
          },
          {
            id: "city", name: "city", type: "text",
            placeholder: "City (auto-filled)", required: true,
            readonly: true, label: "City"
          },
          {
            id: "state", name: "state", type: "text",
            placeholder: "State (auto-filled)", required: true,
            readonly: true, label: "State"
          }
        ]
      }
    ]
  };
  
  res.json(schema);
});

// Step 1 validation
app.post('/api/validate-step1', 
  [validations.aadhaar, validations.otp],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { aadhaar, otp } = req.body;
    
    // ✅ Accept any valid 12-digit Aadhaar with demo OTP
    if (/^[0-9]{12}$/.test(aadhaar) && otp === '123456') {
      res.json({
        success: true,
        message: 'Step 1 validated successfully',
        submissionId: Date.now()
      });
    } else if (!/^[0-9]{12}$/.test(aadhaar)) {
      res.status(400).json({
        success: false,
        message: 'Please enter a valid 12-digit Aadhaar number'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid OTP. Use: 123456'
      });
    }
  }
);


// Step 2 validation
app.post('/api/validate-step2',
  [validations.pan],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { pan, pincode, city, state } = req.body;

    res.json({
      success: true,
      message: 'Registration completed successfully',
      data: { pan, pincode, city, state, registrationId: 'UDYAM-' + Date.now() }
    });
  }
);

// PIN code lookup
app.get('/api/pincode/:pin', async (req, res) => {
  try {
    const pin = req.params.pin;
    
    if (!/^[0-9]{6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PIN code format'
      });
    }

    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await response.json();
    
    if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
      const postOffice = data[0].PostOffice[0];
      res.json({
        success: true,
        data: {
          city: postOffice.District,
          state: postOffice.State,
          area: postOffice.Name,
          pincode: pin
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'PIN code not found' });
    }
  } catch (error) {
    console.error('PIN code API error:', error);
    res.status(500).json({ success: false, message: 'Unable to fetch location data' });
  }
});

// Final form submission
app.post('/api/submit-form', (req, res) => {
  console.log('Form submission received:', req.body);
  
  res.json({ 
    success: true, 
    message: 'Udyam registration submitted successfully',
    registrationId: 'UDYAM-' + Date.now(),
    data: req.body
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
