const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend server is working!' });
});

// Form schema route
app.get('/api/form-schema', (req, res) => {
  console.log('Form schema endpoint hit');
  
  // In your fallback schema, add PIN code field to step 2
// In your fallback schema, add PIN code field to step 2
const fallbackSchema = {
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


  
  res.json(fallbackSchema);
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
    
    if (otp !== '123456') {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    res.json({
      success: true,
      message: 'Step 1 validated successfully',
      submissionId: 1
    });
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

    const { pan, submissionId } = req.body;

    res.json({
      success: true,
      message: 'Registration completed successfully',
      data: { pan, submissionId }
    });
  }
);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Test: http://localhost:${PORT}/api/test`);
  console.log(`📋 Schema: http://localhost:${PORT}/api/form-schema`);
});

// PIN code to city/state API
app.get('/api/pincode/:pin', async (req, res) => {
  try {
    const pin = req.params.pin;
    
    // Validate PIN format
    if (!/^[0-9]{6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid PIN code format'
      });
    }

    // Use PostPin API
    const response = await fetch(`http://postalpincode.in/api/pincode/${pin}`);
    const data = await response.json();
    
    if (data.Status === 'Success' && data.PostOffice && data.PostOffice.length > 0) {
      const postOffice = data.PostOffice[0];
      res.json({
        success: true,
        data: {
          city: postOffice.District,
          state: postOffice.State,
          area: postOffice.Name
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


module.exports = app;
