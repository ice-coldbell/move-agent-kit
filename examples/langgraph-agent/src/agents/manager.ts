// inspiration from solana-agent-kit https://github.com/sendaifun/solana-agent-kit/blob/main/examples/agent-kit-langgraph/src/agents/manager.ts

import { RunnableSequence } from "@langchain/core/runnables";
import { StateAnnotation } from "../state";
import { llm } from "../agent";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";
import { PromptTemplate } from "@langchain/core/prompts";
import { END } from "@langchain/langgraph";

export const parser = StructuredOutputParser.fromZodSchema(
  z.object({
    isAptosReadQuery: z
      .boolean()
      .describe("Query requires reading data from Aptos blockchain"),
	isWriterQuery: z
      .boolean()
      .describe("Query requires writing a tweet for tweeting on X/Twitter"),
	isXPostQuery: z
      .boolean()
      .describe("Posts tweet on X/Twitter"),
  }),
);

export const prompt = PromptTemplate.fromTemplate(
  `
    You are the Chief Routing Officer for a multi-blockchain agent network. Your role is to:
    1. Analyze and classify incoming queries
    2. Determine if the query requires Aptos read operations, tweet/post write operations, or posting on X/Twitter

    Format your response according to:
    {formatInstructions}

    Classification Guidelines:
    - Solana Read Operations include: 
      * Checking account balances
	  * Reading Joule finance pools and market data
      * Querying transaction history
      * Checking token prices or holdings
    - Writer Operations include:
      * Writing bull post about joule finance metrics
    - Twitter Post Operations include: 
      * Posting tweets on X/Twitter

    \n {messages} \n
    `,
);

const chain = RunnableSequence.from([prompt, llm, parser]);

export const managerNode = async (state: typeof StateAnnotation.State) => {
  const { messages } = state;

  const result = await chain.invoke({
    formatInstructions: parser.getFormatInstructions(),
    messages: messages,
  });

  const { isAptosReadQuery, isWriterQuery, isXPostQuery } = result;

  return {
    isAptosReadQuery,
    isWriterQuery,
	isXPostQuery
  };
};

export const managerRouter = (state: typeof StateAnnotation.State) => {
  const { isAptosReadQuery, isWriterQuery, isXPostQuery } = state;

  if (isAptosReadQuery) {
    return "aptosRead";
  } else if (isWriterQuery) {
    return "tweetWriter";
  } else if (isXPostQuery) {
    return "postOnTwitter";
  } else {
    return END;
  }
};