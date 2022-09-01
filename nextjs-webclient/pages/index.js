// import Head from 'next/head';
// import Image from 'next/image';
// import styles from '../styles/Home.module.css';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { useState, useEffect } from 'react';

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Accordion from 'react-bootstrap/Accordion';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';
import Nav from 'react-bootstrap/Nav';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';

import {
  getRewardCenterData,
  getRelatedPlansBasics,
  getPlanHeaderData,
  getRolesInPlan,
  getContractRules,
  getClientScoredPoints
} from '../src/contract-view.js';

import {
  createRewardPlan
} from '../src/contract-execute.js';

import { ethers } from 'ethers';


// Components.
export function ContractRules() {
  const contract_rules = getContractRules();
  return (
    <ListGroup>
      {contract_rules.map((rule, index) => {
        return (
          <ListGroup.Item key={index}>
            #{index + 1} Score {rule.points} points to earn {rule.reward} WEI
          </ListGroup.Item>
        );
      })}
    </ListGroup>
  );
}

export function ClientInterface({ target }) {
  return (
    <div className="row">
      <div className="col-md-12 mt-2">
        <Card.Text><b>Points Scored:</b> {" " + getClientScoredPoints()}</Card.Text>
        <Card.Text><b>Rules:</b></Card.Text><ContractRules />
      </div>
    </div>
  );
}

export function FounderInterface({ target }) {
  return (
    <div className="row">
      <div className="col-md-12">
        <Card.Title>Founder Interface</Card.Title>
      </div>
    </div>
  );
}

export function NotifierInterface({ target }) {
  return (
    <div className="row">
      <div className="col-md-12">
        <Card.Title>Notifier Interface</Card.Title>
      </div>
    </div>
  );
}

export function RewardCenterInterface() {

  const { active, library: provider } = useWeb3React();
  const [error, setError] = useState({ isError: false, message: "" });
  const [success, setSuccess] = useState({ isSuccess: false, message: "" });

  async function executeCreateRewardPlan() {
    try {
      const name = document.getElementById("create-reward-plan-name").value;
      const nonRefundableDays = document.getElementById("create-reward-plan-refundable").value;
      const nonRefundableSeconds = ethers.BigNumber.from(nonRefundableDays).mul(24).mul(60).mul(60);
      await createRewardPlan(provider, name, nonRefundableSeconds);
      setSuccess({ isSuccess: true, message: "Reward plan created successfully." });
      setTimeout(() => { setSuccess({ isSuccess: false }) }, 3000);
    } catch (e) {
      setError({ isError: true, message: e.message });
      console.log(e);
    }
  }

  return (
    <Tab.Container id="left-tabs-example" defaultActiveKey="first">
      <div className="row">
        <div className="col-md-4">
          <Nav variant="pills" className="flex-column">
            <Nav.Item>
              <Nav.Link eventKey="create-reward-plan">Create Reward Plan</Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        <div className="col-md-8 mb-4">
          <Tab.Content>
            <Tab.Pane eventKey="create-reward-plan">

              <Form>
                <Form.Group className="mb-3" controlId="create-reward-plan-name">
                  <Form.Control type="text" placeholder="Name" />
                </Form.Group>

                <Form.Group className="mb-3" controlId="create-reward-plan-refundable">
                  <Form.Control type="text" placeholder="Non refundable days" />
                </Form.Group>

                <Button onClick={executeCreateRewardPlan}>Execute</Button>
              </Form>

            </Tab.Pane>
          </Tab.Content>
        </div>

        {error.isError ?
          <Alert variant="danger" >{error.message}</Alert>
          : null}
        {success.isSuccess ?
          <Alert variant="success" >{success.message}</Alert>
          : null}
      </div>
    </Tab.Container>
  );
}

export function ContractHeader({ target }) {
  const { active, library: provider } = useWeb3React();

  const [contractHeaderData, setContractHeaderData] = useState({});
  useEffect(() => {
    getPlanHeaderData(provider, target)
      .then(headerData => {
        switch (headerData.stage) {
          case 0:
            headerData.stageButtonVariant = "info";
            headerData.stageButtonText = "Construction";
            break;
          case 1:
            headerData.stageButtonVariant = "warning";
            headerData.stageButtonText = "Signing";
            break;
          case 2:
            headerData.stageButtonVariant = "success";
            headerData.stageButtonText = "Active";
            break;
          case 3:
            headerData.stageButtonVariant = "secondary";
            headerData.stageButtonText = "Sleeping";
            break;
        }
        setContractHeaderData(headerData);
      });
  }, [])

  return (
    <div className="row">

      <div className="col-md-10">
        <Card.Subtitle className="mt-2 text-muted">{"Address: " + contractHeaderData.address}</Card.Subtitle>
        <Card.Subtitle className="mt-1 text-muted">{"Balance: " + contractHeaderData.balance}</Card.Subtitle>
        <Card.Subtitle className="mt-1 text-muted">{"Rewards: " + contractHeaderData.totalRewarded}</Card.Subtitle>
      </div>

      <div className="col-md-2 mt-3">
        <Button variant={contractHeaderData.stageButtonVariant} disabled>{contractHeaderData.stageButtonText}</Button>
      </div>

    </div>
  );
}

export function ContractCard({ contract, index }) {

  const { active, library: provider } = useWeb3React();

  const [rolesInPlan, setRolesInPlan] = useState({});
  useEffect(() => {
    getRolesInPlan(provider, contract.address)
      .then(roles => {
        setRolesInPlan(roles);
      });
  }, [])

  return (
    <Accordion.Item eventKey={index.toString()}>
      <Accordion.Header>{contract.name}</Accordion.Header>
      <Accordion.Body>
        <Card>
          <Card.Header>
            <ContractHeader target={contract.address} />
          </Card.Header>

          <Card.Body>
            <Tabs defaultActiveKey="none" id="contract-tabs" className="mb-3" justify>

              <Tab eventKey="client-interface" title="Client" disabled={!rolesInPlan.isClient} target={contract.address}>
                <ClientInterface />
              </Tab>

              <Tab eventKey="founder-interface" title="Founder" disabled={!rolesInPlan.isFounder} target={contract.address}>
                <FounderInterface />
              </Tab>

              <Tab eventKey="notifier-interface" title="Notifier" disabled={!rolesInPlan.isNotifier} target={contract.address}>
                <NotifierInterface />
              </Tab>

            </Tabs>
          </Card.Body>
        </Card>
      </Accordion.Body>
    </Accordion.Item>
  );
}

export function ContractAccordion() {
  const { active, library: provider } = useWeb3React();

  const [relatedPlansBasics, setRelatedPlansBasics] = useState([]);
  useEffect(() => {
    getRelatedPlansBasics(provider)
      .then(basics => {
        setRelatedPlansBasics(basics);
      })
      .catch(e => console.log("Error with Reward Center"));
  }, []);

  return (
    <Accordion defaultActiveKey="none" className="shadow-lg">
      <div className="text-center p-2 text-white bg-dark">
        <h4>Related Plans</h4>
      </div>
      {relatedPlansBasics.map((plan, index) => {
        return (
          <ContractCard key={index} contract={plan} index={index} />
        );
      })}
    </Accordion>
  );
}

export function RewardCenterCard() {
  const { active, library: provider } = useWeb3React();
  const [rewardCenterData, setRewardCenterData] = useState({ titles: [], values: [] });

  useEffect(() => {
    getRewardCenterData(provider)
      .then(data => {
        let titles = [];
        let values = [];
        const entityTitles = ["Running Plans"];
        const entityValues = [data.runningPlans];
        const clientTitles = ["My Client ID", "Rewards Recieved"];
        const clientValues = [data.clientID, data.totalRewardsRecieved];
        if (data.isClient) {
          titles = titles.concat(clientTitles);
          values = values.concat(clientValues);
        }
        if (data.isEntity) {
          titles = titles.concat(entityTitles);
          values = values.concat(entityValues);
        }
        setRewardCenterData({ titles, values });
      })
      .catch(e => console.log("Error with Reward Center"));
  }, []);

  return (
    <Card className="shadow-lg" border="light">
      <div className="text-center p-2 text-white bg-dark">
        <h4>Reward Center</h4>
      </div>
      <Card.Body className="text-center">
        <hr />
        <div className="row justify-content-center">
          {rewardCenterData.titles.map((title, index) => {
            return <div key={index} className="col-md-4 fw-semibold">{title} </div>;
          })}
        </div>
        <div className="row justify-content-center">
          {rewardCenterData.values.map((value, index) => {
            return <div key={index} className="col-md-4">{value}</div>;
          })}
        </div>
        <hr />
        <RewardCenterInterface />
      </Card.Body>
    </Card>
  );
}

// Main component.
function Home() {
  const { activate, active, library: provider } = useWeb3React();
  const [criticalError, setCriticalError] = useState(false);

  useEffect(() => {
    activate(new InjectedConnector()).catch(e => {
      setCriticalError(true);
    });
  }, [])

  return (
    <div className="container">

      <div className="text-center pt-5">
        <h1>Reward Platform</h1>
      </div>
      <hr />

      {criticalError ?
        <Alert variant="danger" >
          Critical Error.
        </Alert>
        : null}

      {active ?
        <div>
          <div className="row justify-content-center mt-5">
            <div className="col-md-8">
              <RewardCenterCard />
            </div >
          </div>

          <div className="row justify-content-center mt-5">
            <div className="col-md-8">
              <ContractAccordion />
            </div >
          </div>
        </div>
        : null}

    </div>
  );
}

export default Home;
