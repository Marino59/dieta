# Project Context: Dieta

## Overview
"Dieta" is a comprehensive progressive web application (PWA) built with Next.js (App Router), React, and Firebase. It is designed to help users track their daily nutritional intake, water consumption, and body weight, promoting a healthier lifestyle through detailed insights and an intuitive user interface.

## Tech Stack
- **Frontend Framework**: Next.js 14 (App Router) with React
- **Styling**: Tailwind CSS for responsive and modern UI
- **Backend & Database**: Firebase (Authentication, Firestore, Storage)
- **Icons**: Lucide React
- **Charts**: Recharts for data visualization (e.g., weight trends)
- **PWA**: Supported (manifest, service workers)

## Key Features
1. **Authentication**: Secure user login, registration, and session management using Firebase Authentication.
2. **Dashboard**: A centralized view displaying daily calorie goals, macronutrient breakdown (carbohydrates, proteins, fats), water intake, and a weight tracking chart.
3. **Meal Tracking**: Users can log their meals by searching for foods or using a barcode scanner. 
4. **Barcode Scanner**: Integrated functionality (`components/BarcodeScanner.js`) to scan food product barcodes and quickly retrieve nutritional information.
5. **Water Tracking**: Simple interface to log daily water consumption.
6. **Weight Tracking**: Users can log their weight, which is visualized on a chart to monitor progress over time.
7. **Profile Management**: Users can update their personal information, goals, and settings in the profile section.

## Architecture & Integration
### External APIs
- **Food Data**: The app integrates with external APIs such as OpenFoodFacts (or Edamam) to fetch detailed nutritional information for logged foods.

### Database Structure (Firestore)
- **Users**: Stores user profiles, application settings, and personalized goals (e.g., daily calorie and macronutrient targets).
- **Daily Logs**: Collections tracking daily activities including logged meals, water intake, and recorded weights.

## UI/UX Design
The application features a mobile-first, clean design utilizing Tailwind CSS. It includes interactive components like modals (e.g., `ConfirmMealModal`), progress bars, and dynamic charts to provide a smooth user experience.

---

*Note: This document is a living draft and should be updated as the project's architecture and business goals evolve.*
