const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - FIXED: Removed trailing slash
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://udyam-registration-portal.vercel.app'] // ✅ No trailing slash
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Handle preflight requests
app.options('*', cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://udyam-registration-portal.vercel.app']
    : ['http://localhost:3000'],
  credentials: true
}));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend server is working!', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// FIXED: Single form schema route (removed duplicate)
app.get('/api/form-schema', (req, res) => {
  console.log('Form schema endpoint hit');
  
  const schema = {
    steps: [
      {
        step: 1,
        title: "Aadhaar Number & OTP Validation",
        fields: [
          {
            id: "aadhaar",
            name: "aadhaar", 
            type: "text",
            placeholder: "Enter 12-digit Aadhaar Number",
            required: true,
            maxLength: 12,
            pattern: "^[0-9]{12}$",
            label: "Aadhaar Number"
          },
          {
            id: "otp",
            name: "otp",
            type: "text", 
            placeholder: "Enter OTP",
            required: true,
            maxLength: 6,
            pattern: "^[0-9]{6}$",
            label: "OTP"
          }
        ]
      },
      {
        step: 2,
        title: "Business Details & PAN Validation",
        fields: [
          {
            id: "pan",
            name: "pan",
            type: "text",
            placeholder: "Enter PAN Number (e.g., ABCDE1234F)", 
            required: true,
            maxLength: 10,
            pattern: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$",
            label: "PAN Number"
          },
          {
            id: "pincode",
            name: "pincode",
            type: "text",
            placeholder: "Enter PIN Code",
            required: true,
            maxLength: 6,
            pattern: "^[0-9]{6}$",
            label: "PIN Code"
          },
          {
            id: "city",
            name: "city", 
            type: "text",
            placeholder: "City (auto-filled)",
            required: true,
            readonly: true,
            label: "City"
          },
          {
            id: "state",
            name: "state",
            type: "text",
            placeholder: "State (auto-filled)",
            required: true, 
            readonly: true,
            label: "State"
          }
        ]
      }
    ]
  };
  
  res.json(schema);
});

// Validation rules
const aadhaarValidation = body('aadhaar')
  .matches(/^[0-9]{12}$/)
  .withMessage('Aadhaar must be 12 digits');

const otpValidation = body('otp')
  .matches(/^[0-9]{6}$/)
  .withMessage('OTP must be 6 digits');

const panValidation = body('pan')
  .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
  .withMessage('Invalid PAN format');

// Step 1 validation
app.post('/api/validate-step1', 
  [aadhaarValidation, otpValidation],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { aadhaar, otp } = req.body;
    
    // Demo validation - use test values
    if (aadhaar === '123456789012' && otp === '123456') {
      res.json({
        success: true,
        message: 'Step 1 validated successfully',
        submissionId: Date.now()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid Aadhaar or OTP. Use: Aadhaar=123456789012, OTP=123456'
      });
    }
  }
);

// Step 2 validation
app.post('/api/validate-step2',
  [panValidation],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { pan, pincode, city, state } = req.body;

    console.log('Step 2 validation:', { pan, pincode, city, state });

    res.json({
      success: true,
      message: 'Registration completed successfully',
      data: { 
        pan, 
        pincode, 
        city, 
        state,
        registrationId: 'UDYAM-' + Date.now()
      }
    });
  }
);

// FIXED: PIN code API with correct endpoint
app.get('/api/pincode/:pin', async (req, res) => {
  try {
    const pin = req.params.pin;
    
    if (!/^[0-9]{6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PIN code format'
      });
    }

    // FIXED: Using correct API endpoint with https
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await response.json();
    
    console.log('PIN Code API Response:', data);
    
    // Handle the API response format correctly
    if (data && data.length > 0 && data[0].Status === 'Success') {
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
      res.status(404).json({
        success: false,
        message: 'PIN code not found'
      });
    }
  } catch (error) {
    console.error('PIN code API error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to fetch location data'
    });
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
