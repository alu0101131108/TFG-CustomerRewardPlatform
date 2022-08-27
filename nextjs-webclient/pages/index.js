import Head from 'next/head';
import Image from 'next/image';
import styles from '../styles/Home.module.css';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
// import { useState } from 'react';
// import { ethers } from 'ethers';

const injected = new InjectedConnector();

export default function Home() {

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
    <div className={styles.container}>
      Hello World!
      {active ? " Connected!" : <button onClick={() => connect()}>Connect</button>}

    </div >
  )
}
