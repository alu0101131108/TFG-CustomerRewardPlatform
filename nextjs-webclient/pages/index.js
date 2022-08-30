// import Head from 'next/head';
// import Image from 'next/image';
// import styles from '../styles/Home.module.css';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Accordion from 'react-bootstrap/Accordion';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import ListGroup from 'react-bootstrap/ListGroup';

const injected = new InjectedConnector();

// Data fetching functions.
async function getRelatedContractAddresses() {

  const addresses = ["0x001", "0x002", "0x003"];
  return addresses;
}
function getContractName() {
  const contract_name = "Canary Islands Associates";
  return contract_name;
}
function getContractAddress() {
  const contract_address = "0x000000000000000000000000000000000000000";
  return contract_address;
}
function getContractStage() {
  const contract_stage = 0;
  return contract_stage;
}
function getContractBalance() {
  const contract_balance = "1000000000000000000";
  return contract_balance;
}
function getContractTotalRewarded() {
  const contract_totalRewarded = '258123';
  return contract_totalRewarded;
}
function getContractRules() {
  const contract_rules = [
    {
      points: '1000',
      reward: '10000'
    },
    {
      points: '2000',
      reward: '20000'
    },
    {
      points: '3000',
      reward: '30000'
    }
  ];
  return contract_rules;
}
function getClientTotalRewards() {
  const totalRewards = '15000';
  return totalRewards;
}
function getClientScoredPoints() {
  const scoredPoints = '200';
  return scoredPoints;
}


// Components.
export function ContractRules() {
  const contract_rules = getContractRules();
  return (
    <ListGroup>
      {contract_rules.map((rule, index) => {
        return (<ListGroup.Item key={index}>#{index + 1} Score {rule.points} points to earn {rule.reward} WEI</ListGroup.Item>);
      })}
    </ListGroup>
  );
}

export function ClientInterface() {
  return (
    <div className="row">
      <div className="col-md-12 mt-2">
        <Card.Text><b>Total Rewards:</b> {" " + getClientTotalRewards()}</Card.Text>
        <Card.Text><b>Points Scored:</b> {" " + getClientScoredPoints()}</Card.Text>
        <Card.Text><b>Rules:</b></Card.Text><ContractRules />
      </div>
    </div>
  );
}

export function FounderInterface() {
  return (
    <div className="row">
      <div className="col-md-12">
        <Card.Title>Founder Interface</Card.Title>
      </div>
    </div>
  );
}

export function NotifierInterface() {
  return (
    <div className="row">
      <div className="col-md-12">
        <Card.Title>Notifier Interface</Card.Title>
      </div>
    </div>
  );
}

export function ContractHeader() {
  let variant, text;
  switch (getContractStage()) {
    case 0:
      variant = "info";
      text = "Construction";
      break;
    case 1:
      variant = "warning";
      text = "Signing";
      break;
    case 2:
      variant = "success";
      text = "Active";
      break;
    case 3:
      variant = "secondary";
      text = "Sleeping";
      break;
  }

  return (
    <div className="row">

      <div className="col-md-10">
        <Card.Subtitle className="mt-2 text-muted">{"Address: " + getContractAddress()}</Card.Subtitle>
        <Card.Subtitle className="mt-1 text-muted">{"Balance: " + getContractBalance()}</Card.Subtitle>
        <Card.Subtitle className="mt-1 text-muted">{"Rewards: " + getContractTotalRewarded()}</Card.Subtitle>
      </div>

      <div className="col-md-2 mt-3">
        <Button variant={variant} disabled>{text}</Button>
      </div>

    </div>
  );
}

export function ContractCard() {
  return (
    <div>
      <Accordion.Header>{getContractName()}</Accordion.Header>
      <Accordion.Body>
        <Card>
          <Card.Header>
            <ContractHeader />
          </Card.Header>

          <Card.Body>

            <Tabs defaultActiveKey="client-interface" id="contract-tabs" className="mb-3">

              <Tab eventKey="client-interface" title="Client">
                <ClientInterface />
              </Tab>

              <Tab eventKey="founder-interface" title="Founder">
                <FounderInterface />
              </Tab>

              <Tab eventKey="notifier-interface" title="Notifier">
                <NotifierInterface />
              </Tab>

            </Tabs>
          </Card.Body>
        </Card>
      </Accordion.Body>
    </div>
  );
}

export function ContractAccordion() {
  return (
    <Accordion defaultActiveKey="0">

      <Accordion.Item eventKey="0">
        <ContractCard />
      </Accordion.Item>

    </Accordion>
  );
}

// Main component.
function Home() {

  const { activate, active, library: provider } = useWeb3React();

  async function connect() {
    try {
      await activate(injected);
    }
    catch (e) {
      console.log(e);
    }
  };

  return (
    <div className="container">

      <div className="row">
        <div className="mt-4 mb-4 col-md-12 text-center">
          {active ? " Connected!" : <button onClick={() => connect()}>Connect</button>}
        </div>
      </div>

      <div className="row">
        <div className="col-md-12">
          <ContractAccordion />
        </div >
      </div>
    </div>
  );
}

export default Home;
