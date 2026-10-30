// Pin a time zone with daylight saving so local-time tests are the same on every machine and catch DST bugs.
module.exports = () => {
  process.env.TZ = 'America/New_York';
};
