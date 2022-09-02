import Router from "next/router";
import { useWeb3React } from '@web3-react/core';
import { useState, useEffect } from 'react';
import { InjectedConnector } from '@web3-react/injected-connector';
const injector = new InjectedConnector();

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
import Badge from 'react-bootstrap/Badge';

import {
  getRewardCenterData,
  getRelatedPlansBasics,
  getPlanHeaderData,
  getRolesInPlan,
  getContractRules,
  getClientScoredPoints,
  getFounderRelatedData
} from '../src/contract-view.js';

import {
  createRewardPlanInterface,
  signUpClientInterface,
  notifyPointsScoredInterface,
  leavePlanInterface,
  addFounderInterface,
  addNotifierInterface,
  addRewardRuleInterface,
  removeRewardRuleInterface,
  beginSigningStageInterface,
  signInterface,
  refundAndResetInterface,
  awakePlanInterface
} from '../src/contract-execute.js';


// Components.
export function ExecutionInterface({ target, elements, contractIndex }) {
  const { active, library: provider } = useWeb3React();
  const [error, setError] = useState({ isError: false, message: "" });
  const [success, setSuccess] = useState({ isSuccess: false, message: "" });

  async function executeContractFunction(targetFunction, successMessage) {
    try {
      await targetFunction(provider, target, contractIndex);
      setSuccess({ isSuccess: true, message: successMessage });
      setTimeout(() => { Router.reload(); }, 500);
    }
    catch (e) {
      setError({ isError: true, message: e.reason || e.message });
      console.log(e);
      setTimeout(() => { setError({ isError: false }) }, 5000);
    }
  }

  return (
    <Tab.Container id="left-tabs-example" defaultActiveKey="first">
      <div className="row  text-center align-items-center">
        <div className="col-md-4">
          <Nav variant="pills" className="flex-column">
            <ListGroup>
              {elements.map((element, index) => {
                return (
                  <ListGroup.Item key={index} variant="light">
                    <Nav.Item >
                      <Nav.Link disabled={element.disabled} eventKey={element.navEventKey}>{element.navText}</Nav.Link>
                    </Nav.Item>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </Nav>
        </div>

        <div className="col-md-8 mb-4">
          <Tab.Content>
            {elements.map((element, elementIndex) => {
              return (
                <Tab.Pane key={elementIndex} eventKey={element.navEventKey}>
                  <Form>
                    {element.controls.map((control, controlIndex) => {
                      return (
                        <Form.Group key={controlIndex} className="mb-3" controlId={element.navEventKey + "-" + control.id + "-" + contractIndex}>
                          {control.checkbox ?
                            <div className="row justify-content-center">
                              <div className="col-md-4">
                                <Form.Check type="checkbox" label={control.placeholder} />
                              </div>
                            </div>
                            : <Form.Control type="text" placeholder={control.placeholder} />
                          }
                        </Form.Group>
                      );
                    })}
                    <Button onClick={() => executeContractFunction(element.executeFunction, element.successMessage)}>Execute</Button>
                  </Form>
                </Tab.Pane>
              );
            })}
          </Tab.Content>
        </div>
      </div>

      {error.isError ?
        <Alert variant="danger" >{error.message}</Alert>
        : null}
      {success.isSuccess ?
        <Alert variant="success" >{success.message}</Alert>
        : null}
    </Tab.Container>
  );
}

export function ClientInterface({ target }) {
  const { active, library: provider } = useWeb3React();

  const [scoredPoints, setScoredPoints] = useState(0);
  useEffect(() => {
    getClientScoredPoints(provider, target).then((score) => {
      setScoredPoints(score);
    });
  }, []);

  return (
    <div className="row justify-content-center">
      <hr className="w-75 mt-4" />
      <div className="col-md-12 fw-semibold text-center">
        <Card.Text>Points Scored</Card.Text>
      </div>
      <div className="col-md-12 mt-2 text-center">
        <Card.Text>{scoredPoints}</Card.Text>
      </div>
      <hr className="w-75 mt-3" />
    </div>
  );
}

export function FounderInterface({ target, contractIndex }) {
  const { active, library: provider } = useWeb3React();

  const [functionInterfaces, setfunctionInterfaces] = useState([]);
  const [founderRelatedData, setFounderRelatedData] = useState({ notReady: true });
  useEffect(() => {
    getFounderRelatedData(provider, target).then((data) => {
      if (!data.isRefundable) refundAndResetInterface['disabled'] = true;
      if (!data.canLeavePlan) leavePlanInterface['disabled'] = true;
      switch (data.stage) {
        case 0:
          setfunctionInterfaces([addFounderInterface, addNotifierInterface, addRewardRuleInterface, removeRewardRuleInterface, beginSigningStageInterface, leavePlanInterface]);
          break;
        case 1:
          setfunctionInterfaces([signInterface, refundAndResetInterface, leavePlanInterface]);
          break;
        case 2:
          break;
        case 3:
          setfunctionInterfaces([awakePlanInterface, leavePlanInterface]);
          break;
      }
      setFounderRelatedData(data);
    });
  }, []);

  return founderRelatedData.notReady ? null : (
    <div>
      <div className="row mt-4 justify-content-center">
        <hr className="w-75" />

        <div className="col-md-12 mb-3">
          <ListGroup>
            <div className="text-center fw-semibold mb-2">Founders</div>
            {founderRelatedData.founders.map((founder, index) => {
              return (
                <ListGroup.Item key={index}>
                  <div className="row">
                    <div className="col-md-10 p-2">
                      {"#" + (index + 1) + ": " + founder.address + " - " + founder.collaborationAmount + " WEI"}
                    </div>
                    <div className="col-md-2 text-center p-2">
                      {founder.signed ? <Badge bg="primary" pill className="p-2"> Signed </Badge> : null}
                    </div>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </div>

        <div className="col-md-12 mb-3">
          <ListGroup>
            <div className="text-center fw-semibold mb-2">{founderRelatedData.notifiers.length === 0 ? "Notifiers (empty)" : "Notifiers"}</div>
            {founderRelatedData.notifiers.map((notifier, index) => {
              return (
                <ListGroup.Item key={index}>
                  {"#" + (index + 1) + ": " + notifier}
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </div>

        <hr className="w-75 mt-2 mb-4" />
      </div>
      <ExecutionInterface target={target} elements={functionInterfaces} contractIndex={contractIndex} />
    </div >
  );
}

export function NotifierInterface({ target, contractIndex }) {
  const functionInterfaces = [signUpClientInterface, notifyPointsScoredInterface, leavePlanInterface];
  return (
    <div className="row mt-4">
      <ExecutionInterface target={target} elements={functionInterfaces} contractIndex={contractIndex} />
    </div>
  );
}

export function RewardCenterInterface() {
  const { active, library: provider } = useWeb3React();
  const functionInterfaces = [createRewardPlanInterface];
  return (
    <ExecutionInterface elements={functionInterfaces} contractIndex="0" />
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

export function ContractCard({ contract, contractIndex }) {
  const { active, library: provider } = useWeb3React();

  const [rolesInPlan, setRolesInPlan] = useState({});
  useEffect(() => {
    getRolesInPlan(provider, contract.address)
      .then(roles => {
        setRolesInPlan(roles);
      });
  }, [])

  const [contractRules, setContractRules] = useState([]);
  useEffect(() => {
    getContractRules(provider, contract.address).then(result => {
      setContractRules(result)
    });
  }, []);

  return (
    <Accordion.Item eventKey={contractIndex}>
      <Accordion.Header>{contract.name}</Accordion.Header>
      <Accordion.Body>
        <Card>
          <Card.Header>
            <ContractHeader target={contract.address} />
          </Card.Header>

          <Card.Body >
            <ListGroup>
              <div className="text-center fw-semibold mb-2">{contractRules.length === 0 ? "No reward rules yet" : "Contract Rules"}</div>
              {contractRules.map((rule, index) => {
                return (
                  <ListGroup.Item key={index}>
                    #{index + 1}: Score {rule.points} points to earn {rule.reward} WEI
                  </ListGroup.Item>
                );
              })}
            </ListGroup>

            <Tabs defaultActiveKey="none" id="contract-tabs" className="mt-3" justify>
              <Tab eventKey="client-interface" title="Client" disabled={!rolesInPlan.isClient} target={contract.address}>
                <ClientInterface target={contract.address} contractIndex={contractIndex} />
              </Tab>

              <Tab eventKey="founder-interface" title="Founder" disabled={!rolesInPlan.isFounder} target={contract.address}>
                <FounderInterface target={contract.address} contractIndex={contractIndex} />
              </Tab>

              <Tab eventKey="notifier-interface" title="Notifier" disabled={!rolesInPlan.isNotifier} target={contract.address}>
                <NotifierInterface target={contract.address} contractIndex={contractIndex} />
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
          <ContractCard key={index} contract={plan} contractIndex={index} />
        );
      })}
    </Accordion>
  );
}

export function RewardCenterCard() {
  const { active, library: provider } = useWeb3React();
  const [rewardCenterData, setRewardCenterData] = useState({ titles: [], values: [], connected: false });

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
        if (!data.isClient && !data.isEntity) {
          titles = ["No information related to the current account"];
        }
        setRewardCenterData({ titles, values, connected: true });
      })
      .catch(e => console.log("Error with Reward Center"));
  }, []);

  return (
    <Card className="shadow-lg" border="light">
      <div className="text-center p-2 text-white bg-dark">
        <h4>Reward Center</h4>
      </div>
      <Card.Body>
        <hr />
        <div className="row justify-content-center text-center">
          {rewardCenterData.titles.map((title, index) => {
            return <div key={index} className="col-md-4 fw-semibold">{title} </div>;
          })}
        </div>
        <div className="row justify-content-center text-center">
          {rewardCenterData.values.map((value, index) => {
            return <div key={index} className="col-md-4">{value}</div>;
          })}
        </div>
        <hr />
        {rewardCenterData.connected ? <RewardCenterInterface /> : null}
      </Card.Body>
    </Card>
  );
}

// Main component.
function Home() {
  const { activate, active, library: provider } = useWeb3React();
  const [providerError, setProviderError] = useState(false);

  useEffect(() => {
    activate(injector).catch(e => {
      setProviderError(true);
    });
  }, [])

  return (
    <div className="container">

      <div className="text-center pt-5">
        <h1>Reward Platform</h1>
      </div>
      <hr />

      {providerError ?
        <Alert variant="danger" className='row justify-content-center'>
          <div className='row justify-content-center'>Error connecting to Metamask</div>
          <div className='row w-25 mt-2'><Button onClick={() => activate(injector)}>Retry</Button></div>
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

    </div >
  );
}

export default Home;
