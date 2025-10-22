# Single-Session CV Builder - Usage Guide

## 🎯 **What Changed**

Your S4CV dashboard has been converted from a multi-step slide system to a **single-session voice recording** where you speak all your information at once.

## 🎤 **How It Works**

### **Before (5 Slides System):**
- Step 1: Contact Info ❌
- Step 2: Experience ❌ 
- Step 3: Education ❌
- Step 4: Skills ❌
- Step 5: Review ❌

### **Now (Single Session):**
1. **Press Record** 🎤
2. **Speak Everything** - Tell your complete professional story
3. **AI Extracts & Structures** - Automatically organizes into CV sections
4. **Preview & Export** - See your formatted CV and download

## 📝 **What to Include in Your Recording**

When you press record, speak naturally about:

```
"My name is John Doe, my email is john@example.com, 
my phone number is +91 9876543210. I live in Mumbai, India. 

I work as a Senior Software Engineer at Tech Corp for the past 3 years. 
Before that, I was a Junior Developer at StartUp Inc for 2 years. 
I have experience in project management and team leadership.

I completed my B.Tech in Computer Science from IIT Mumbai in 2018. 
I also have a certification in Machine Learning.

My technical skills include JavaScript, Python, React, Node.js, and AWS. 
I'm fluent in English, Hindi, and Marathi. I have strong communication 
and problem-solving skills."
```

## 🤖 **AI Processing**

The system automatically:
- **Extracts Names** from "My name is..." patterns
- **Finds Contact Info** using email/phone regex patterns  
- **Identifies Companies** and work experience
- **Detects Education** institutions and degrees
- **Categorizes Skills** into technical/soft skills
- **Maps Languages** mentioned
- **Creates Summary** from your description

## 📋 **Generated CV Structure**

The AI organizes your speech into:

### Contact Information
- Name: `Extracted from "My name is..."`
- Email: `email@domain.com patterns`
- Phone: `Phone number patterns`
- Location: `City, Country mentions`

### Professional Summary
- `Generated from your description`

### Work Experience  
- Company: `Organization names detected`
- Position: `Job titles mentioned`
- Duration: `Time periods found`
- Description: `Context around companies`

### Education
- Institution: `Universities/colleges mentioned`
- Degree: `B.Tech, MBA, etc.`
- Field: `Computer Science, Engineering, etc.`

### Skills
- Technical: `Programming languages, tools`
- Soft Skills: `Leadership, communication, etc.`
- Languages: `English, Hindi, etc.`

## 🎯 **Benefits**

✅ **No More Slides** - One continuous recording
✅ **Natural Speech** - Talk like you're introducing yourself
✅ **AI Intelligence** - Automatically structures everything
✅ **Time Efficient** - Complete CV in 2-3 minutes
✅ **Multilingual** - Works in all 13 supported languages
✅ **Professional Output** - Proper CV formatting with sections

## 🚀 **Usage Tips**

1. **Speak Clearly** - Clear pronunciation helps AI accuracy
2. **Include Everything** - Name, contact, experience, education, skills
3. **Natural Flow** - Don't worry about order, AI will organize
4. **Specific Details** - Mention company names, technologies, etc.
5. **Review Preview** - Check the generated CV before exporting

## 🔧 **Technical Details**

- **NER Engine**: Extracts entities using multilingual patterns
- **CV Mapper**: Structures entities into proper CV format  
- **Export Options**: PDF and Word with proper headings
- **Confidence Scoring**: Shows reliability of extracted information
- **Preview System**: See formatted CV before downloading

---

**Ready to try?** Open `dashboard.html` and press the record button! 🎤
