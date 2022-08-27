const getEventArguments = async function (transaction, expectedEvent) {
  const rc = await transaction.wait();
  const event = rc.events.find(event => event.event = expectedEvent);
  return event.args;
}

const Stages = {
  CONSTRUCTION: 0,
  SIGNING: 1,
  ACTIVE: 2,
  SLEEPING: 3
}

module.exports = { getEventArguments, Stages };