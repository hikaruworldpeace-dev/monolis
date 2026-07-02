/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
      colors: {
        accent: "#4F8EF7",
        success: "#3CCB7F",
        warning: "#FFB84D",
      },
    },
  },
  plugins: [],
};
