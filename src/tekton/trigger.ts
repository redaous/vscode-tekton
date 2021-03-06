/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/

import { TektonNode, Command } from '../tkn';
import * as cliInstance from '../cli';
import { PipelineWizard } from '../pipeline/wizard';
import { ViewColumn } from 'vscode';
import { pipelineData, TknResourceItem } from './webviewstartpipeline';
import { TknPipelineTrigger } from '../tekton';
import { TektonItem } from './tektonitem';
import { multiStepInput } from '../util/MultiStepInput';
import { addTriggerToPipeline } from './addtrigger';


export async function addTrigger(pipeline: TektonNode): Promise<string> {
  if (!pipeline) return null;
  const result: cliInstance.CliExitData = await TektonItem.tkn.execute(Command.getPipeline(pipeline.getName()), process.cwd(), false);
  let data: TknPipelineTrigger;
  if (result.error) {
    console.log(result + ' Std.err when processing pipelines');
  }
  try {
    data = JSON.parse(result.stdout);
  } catch (ignore) {
    //show no pipelines if output is not correct json
  }
  const trigger = await pipelineData(data, true);
  if (!trigger.params && !trigger.resources && !trigger.workspaces) {
    selectTrigger(trigger);
  } else {
    PipelineWizard.create({ trigger, resourceColumn: ViewColumn.Active }, ViewColumn.Active, 'Add Trigger', trigger.name);
  }
}

async function selectTrigger(trigger: TknResourceItem): Promise<string> {
  const initialResourceFormValues = {
    name: undefined,
    params: [],
    resources: [],
    workspaces: [],
    trigger: undefined
  }
  const pick = await multiStepInput.showQuickPick({
    title: 'Webhook: Git Provider Type',
    placeholder: 'Select Git Provider Type',
    items: trigger.trigger,
  });
  initialResourceFormValues.name = trigger.name;
  initialResourceFormValues.trigger = pick;
  return await addTriggerToPipeline(initialResourceFormValues);
}
