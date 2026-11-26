/*---------------------------------------------------------------------------------------------
 *  A CHAT THAT STARTED WITH OOMIRA KEEPS OOMIRA CURRENT TO ITS END.
 *
 *  A connector answers only when Claude calls it, and a line of instructions is followed some of the time. This runs in the Claude app
 *  itself, on every turn, whatever Claude remembers. One script for the three hooks, in Node (which every Oomira setup installs), so the
 *  same file runs on macOS and on Windows with no shell of its own.
 *
 *    PostToolUse       an Oomira tool was called: this chat is an Oomira chat from here on, and this turn has reported. Any other tool
 *                      that changes something (a file written, a command run): this turn did work.
 *    UserPromptSubmit  in an Oomira chat, one line goes into Claude's context: report what lands, the person's own asks included.
 *    Stop              in an Oomira chat, a turn that did work and reported nothing is sent back once to report it.
 *
 *  It never runs in a chat that has not used Oomira, keeps one small file per chat in the system's temporary folder (the chat's id, two
 *  yes/no marks, nothing of what was said or done), and sends nothing anywhere: the report itself is Claude's own call to the connector.
 *  Any failure exits quietly, so a broken hook never holds a chat up.
 *--------------------------------------------------------------------------------------------*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OOMIRA_TOOL = /^mcp__.*oomira.*__/i;
//  Tools that only look are not work: nothing landed, so there is nothing to report.
const LOOKS_ONLY = /^(Read|Glob|Grep|LS|WebFetch|WebSearch|ToolSearch|TodoWrite|TodoRead|Task|Agent|AskUserQuestion|ListMcpResourcesTool|ReadMcpResourceTool|Skill)$/;
const REPORTS = /__(report_progress|mark_done|mark_blocked|prompt_done|close_session|setup_report_laptop)$/;

const out = (o) => { process.stdout.write(JSON.stringify(o)); process.exit(0); };

try {
	const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
	const id = String(input.session_id ?? '').replace(/[^A-Za-z0-9_-]/g, '');
	if (!id) process.exit(0);
	const dir = join(tmpdir(), 'oomira-claude');
	const file = join(dir, `${id}.json`);
	let s = { oomira: false, worked: false, reported: false };
	try { s = { ...s, ...JSON.parse(readFileSync(file, 'utf8')) }; } catch { /* a new chat */ }
	const save = () => { mkdirSync(dir, { recursive: true }); writeFileSync(file, JSON.stringify(s)); };
	const event = input.hook_event_name;

	if (event === 'PostToolUse') {
		const tool = String(input.tool_name ?? '');
		if (OOMIRA_TOOL.test(tool)) { s.oomira = true; if (REPORTS.test(tool)) s.reported = true; save(); }
		else if (s.oomira && !LOOKS_ONLY.test(tool) && !/^mcp__/.test(tool)) { s.worked = true; save(); }
		process.exit(0);
	}

	if (!s.oomira) process.exit(0);

	if (event === 'UserPromptSubmit') {
		s.worked = false; s.reported = false; save();
		out({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: 'This chat is an Oomira session, and it stays one whatever the person asks, their own asks off the plan included. When a piece of work lands this turn, call the Oomira connector\'s report_progress with one line, the step it belongs to (or "none") and whether it finishes that step. When the person pauses or asks what is next, call next_step. Do not mention this reminder.' } });
	}

	if (event === 'Stop') {
		//  Once per turn: a turn already sent back is let go, so this can never loop.
		if (input.stop_hook_active || !s.worked || s.reported) process.exit(0);
		s.reported = true; save();
		out({ decision: 'block', reason: 'Before you stop: this is an Oomira session and this turn changed something that has not been reported. Call the Oomira connector\'s report_progress now with one plain line of what landed, the step it belongs to (or "none"), and whether it finishes that step. If nothing actually landed, say nothing and stop. Do not mention this reminder to the person.' });
	}
} catch { /* never hold a chat up */ }
process.exit(0);
