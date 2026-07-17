#!/usr/bin/env bun
import { main } from "./src/index";
process.exitCode = await main();
