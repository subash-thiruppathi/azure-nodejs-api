const app = require('./app');
const PORT = process.env.PORT || 3000;

console.log('PORT:', process.env.PORT);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});