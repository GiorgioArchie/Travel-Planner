// ********************** Initialize server **********************************

const server = require('../src/index'); //TODO: Make sure the path to your index.js is correctly added

// ********************** Import Libraries ***********************************

const chai = require('chai'); // Chai HTTP provides an interface for live integration testing of the API's.
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const {assert, expect} = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  // Sample test case given to test / endpoint.
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// *********************** TODO: WRITE 2 UNIT TESTCASES **************************
// Explanation: The testcase will call the /add_user API with the following input
// and expects the API to return a status of 200 along with the "Success" message.
describe('Testing Add User API', () => {
  const uniqueUser = `test_user_${Date.now()}`;
  
    it('positive : /register successfully', done => {
      chai
        .request(server)
        .post('/register')
        .send({ username: uniqueUser, password: 'password1', test: true })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.message).to.equal('Success');
          done();
        });
    });
  
    it('negative : /register with missing username or password', done => {
      chai
        .request(server)
        .post('/register')
        .send({ test: true })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equals('Username and password are required');
          done();
        });
    });
  });
  
  // testing Redirect and Render
  describe('Testing Redirect', () => {
    // Sample test case given to test /test endpoint.
    it('GET / should redirect to /login with 302 HTTP status code', done => {
      chai
        .request(server)
        .get('/')
        .redirects(0)
        .end((err, res) => {
          res.should.have.status(302); // Expecting a redirect status code
          res.should.redirectTo(/\/login$/); // Expecting a redirect to /login with the mentioned Regex
          done();
        });
    });
  });

  describe('Testing Render', () => {
    it('GET /login should render login page with HTML response', done => {
      chai
        .request(server)
        .get('/login')
        .end((err, res) => {
          res.should.have.status(200);
          res.should.be.html;
          done();
        });
    });
  });
  
  describe('Testing /api/destinations endpoint', () => {
    const testUser = {
      username: `dest_user_${Date.now()}`,
      password: 'testpass123'
    };
  
    let agent;
  
    before(async () => {
      // Register the test user directly via the app route
      await chai
        .request(server)
        .post('/register')
        .send({ ...testUser, test: true });
    });
  
    beforeEach(() => {
      agent = chai.request.agent(server);
    });
  
    afterEach(() => {
      agent.close();
    });

    it('positive: GET /api/destinations after logging in should return an array', async () => {
      // Log in first
      await agent.post('/login').send(testUser);
  
      // Then call the API
      const res = await agent.get('/api/destinations');
  
      res.should.have.status(200);
      res.body.should.be.an('array');
    });
  });
  
    it('negative: GET /api/destinations without logging in should return 401', done => {
      chai
        .request(server)
        .get('/api/destinations')
        .end((err, res) => {
          res.should.have.status(401);
          res.text.should.include('Please log in to access this page');
          done();
        });
    });
  
    
  

  
// ********************************************************************************