/**
 * Seed script
 *   npm run seed            -> creates an admin user, a demo user and demo applications/interviews
 *   npm run seed:destroy    -> removes the seeded admin + demo users (and the demo user's data)
 *
 * Passwords come from SEED_ADMIN_PASSWORD / SEED_DEMO_PASSWORD in .env.
 * If they are empty, a random password is generated and printed ONCE in the console.
 * Existing users are never modified (their passwords are not reset).
 */
const crypto = require('crypto');
const dns = require('dns');
const mongoose = require('mongoose');

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {}
const env = require('../src/config/env');
const User = require('../src/models/User');
const Application = require('../src/models/Application');
const Interview = require('../src/models/Interview');

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@jobtrack.test').toLowerCase();
const DEMO_EMAIL = (process.env.SEED_DEMO_EMAIL || 'demo@jobtrack.test').toLowerCase();

const generatePassword = () => `Jt${crypto.randomBytes(6).toString('hex')}9`;
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const ensureUser = async ({ name, email, role, passwordFromEnv }) => {
  let user = await User.findOne({ email });
  if (user) {
    console.log(`- ${role} already exists: ${email} (password unchanged)`);
    return user;
  }
  const password = passwordFromEnv || generatePassword();
  user = await User.create({ name, email, password, role });
  console.log(`- ${role} created: ${email}`);
  console.log(`  password: ${passwordFromEnv ? '(taken from .env)' : password}`);
  return user;
};

const demoApplications = (userId) => [
  { company: 'Nexa Labs', position: 'Backend Engineer', status: 'interview', workType: 'remote', source: 'linkedin', priority: 'high', salaryMin: 60000, salaryMax: 90000, appliedAt: daysFromNow(-14), location: 'Dhaka', notes: 'Referred by a former colleague.' },
  { company: 'Bluewave Tech', position: 'Full Stack Developer', status: 'applied', workType: 'hybrid', source: 'bdjobs', priority: 'medium', appliedAt: daysFromNow(-6), deadline: daysFromNow(10) },
  { company: 'Cloudnine Systems', position: 'Node.js Developer', status: 'assessment', workType: 'remote', source: 'company-website', priority: 'high', appliedAt: daysFromNow(-9) },
  { company: 'DataNest', position: 'Junior Software Engineer', status: 'saved', workType: 'onsite', source: 'linkedin', priority: 'low', deadline: daysFromNow(20) },
  { company: 'Evergreen Digital', position: 'API Developer', status: 'offer', workType: 'hybrid', source: 'referral', priority: 'high', salaryMin: 50000, salaryMax: 70000, appliedAt: daysFromNow(-30) },
  { company: 'FinEdge', position: 'Software Engineer Intern', status: 'rejected', jobType: 'internship', source: 'linkedin', priority: 'medium', appliedAt: daysFromNow(-25) },
  { company: 'GreenByte', position: 'MERN Stack Developer', status: 'withdrawn', workType: 'remote', source: 'other', priority: 'low', appliedAt: daysFromNow(-20) },
  { company: 'HelioSoft', position: 'Backend Developer', status: 'applied', workType: 'onsite', source: 'bdjobs', priority: 'medium', appliedAt: daysFromNow(-2) },
].map((app) => ({ ...app, user: userId }));

const seed = async () => {
  console.log('Seeding...');
  const admin = await ensureUser({
    name: 'JobTrack Admin', email: ADMIN_EMAIL, role: 'admin', passwordFromEnv: process.env.SEED_ADMIN_PASSWORD,
  });
  if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
  }
  const demo = await ensureUser({
    name: 'Demo User', email: DEMO_EMAIL, role: 'user', passwordFromEnv: process.env.SEED_DEMO_PASSWORD,
  });

  let created = 0;
  for (const data of demoApplications(demo._id)) {
    const exists = await Application.findOne({ user: demo._id, company: data.company, position: data.position })
      .collation({ locale: 'en', strength: 2 });
    if (!exists) {
      await Application.create(data);
      created += 1;
    }
  }
  console.log(`- demo applications created: ${created}`);

  const nexa = await Application.findOne({ user: demo._id, company: 'Nexa Labs' });
  const evergreen = await Application.findOne({ user: demo._id, company: 'Evergreen Digital' });
  const interviews = [
    nexa && { application: nexa._id, round: 1, type: 'hr', mode: 'online', scheduledAt: daysFromNow(-7), result: 'passed' },
    nexa && { application: nexa._id, round: 2, type: 'technical', mode: 'online', scheduledAt: daysFromNow(4), result: 'pending', locationOrLink: 'https://meet.example.com/nexa-round-2' },
    evergreen && { application: evergreen._id, round: 1, type: 'technical', mode: 'onsite', scheduledAt: daysFromNow(-18), result: 'passed' },
    evergreen && { application: evergreen._id, round: 2, type: 'behavioral', mode: 'onsite', scheduledAt: daysFromNow(-10), result: 'passed' },
  ].filter(Boolean);

  let interviewsCreated = 0;
  for (const item of interviews) {
    const exists = await Interview.findOne({ application: item.application, round: item.round });
    if (!exists) {
      await Interview.create({ ...item, user: demo._id });
      interviewsCreated += 1;
    }
  }
  console.log(`- demo interviews created: ${interviewsCreated}`);
  console.log('Done.');
};

const destroy = async () => {
  console.log('Removing seeded users and demo data...');
  const users = await User.find({ email: { $in: [ADMIN_EMAIL, DEMO_EMAIL] } });
  for (const user of users) {
    await Interview.deleteMany({ user: user._id });
    await Application.deleteMany({ user: user._id });
    await user.deleteOne();
    console.log(`- removed ${user.email}`);
  }
  console.log('Done.');
};

(async () => {
  try {
    await mongoose.connect(env.mongoUri);
    await Promise.all([User.init(), Application.init(), Interview.init()]);
    if (process.argv.includes('--destroy')) await destroy();
    else await seed();
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
