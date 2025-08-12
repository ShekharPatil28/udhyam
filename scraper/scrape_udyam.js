const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeUdyamForm() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://udyamregistration.gov.in/UdyamRegistration.aspx', {
      waitUntil: 'networkidle2'
    });

    // Extract form fields for Step 1 & 2
    const formData = await page.evaluate(() => {
      const fields = [];
      
      // Get all input fields
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (input.type !== 'hidden') {
          fields.push({
            id: input.id || input.name,
            name: input.name,
            type: input.type,
            placeholder: input.placeholder,
            required: input.required,
            maxLength: input.maxLength,
            pattern: input.pattern,
            className: input.className,
            label: input.labels?.[0]?.textContent?.trim() || ''
          });
        }
      });

      // Get validation messages
      const validationMessages = {};
      const validators = document.querySelectorAll('[data-validation], .validation-message');
      validators.forEach(v => {
        validationMessages[v.getAttribute('for') || v.id] = v.textContent;
      });

      return {
        fields,
        validationMessages,
        steps: [
          {
            step: 1,
            title: "Aadhaar Number & OTP Validation",
            fields: fields.filter(f => 
              f.name?.includes('aadhaar') || 
              f.name?.includes('otp') || 
              f.id?.includes('aadhaar') || 
              f.id?.includes('otp')
            )
          },
          {
            step: 2,
            title: "PAN Validation",
            fields: fields.filter(f => 
              f.name?.includes('pan') || 
              f.id?.includes('pan')
            )
          }
        ]
      };
    });

    // Save scraped data
    fs.writeFileSync('./scraped_form_data.json', JSON.stringify(formData, null, 2));
    console.log('Form data scraped successfully!');
    
  } catch (error) {
    console.error('Scraping error:', error);
  } finally {
    await browser.close();
  }
}

// Fallback form schema if scraping fails
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
      title: "PAN Validation",
      fields: [
        {
          id: "pan",
          name: "pan",
          type: "text",
          placeholder: "Enter PAN Number",
          required: true,
          maxLength: 10,
          pattern: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$",
          label: "PAN Number"
        }
      ]
    }
  ]
};

module.exports = { scrapeUdyamForm, fallbackSchema };
