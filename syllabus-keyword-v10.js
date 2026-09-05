// Keyword-aware syllabus extraction for Class Task Scheduler Pro.
(function () {
    'use strict';

    const TYPE_RULES = [
        { type: 'final', label: 'Final Exam', words: ['final exam', 'final examination', 'final assessment'] },
        { type: 'midterm', label: 'Midterm', words: ['midterm', 'mid-term', 'mid term'] },
        { type: 'quiz', label: 'Quiz', words: ['quiz', 'quizzes'] },
        { type: 'test', label: 'Test', words: ['test', 'tests'] },
        { type: 'exam', label: 'Exam', words: ['exam', 'exams', 'examination', 'examinations'] },
        { type: 'lab', label: 'Lab', words: ['lab', 'labs', 'laboratory', 'lab report', 'lab practical'] },
        { type: 'project', label: 'Project', words: ['project', 'projects', 'milestone', 'deliverable', 'capstone'] },
        { type: 'paper', label: 'Paper', words: ['paper', 'essay', 'report', 'reflection paper', 'research paper'] },
        { type: 'presentation', label: 'Presentation', words: ['presentation', 'presentations', 'oral presentation'] },
        { type: 'homework', label: 'Homework', words: ['homework', 'problem set', 'problem sets', 'pset', 'worksheet', 'worksheets'] },
        { type: 'reading', label: 'Reading', words: ['lecture note', 'lecture notes', 'class notes', 'course notes', 'reading', 'readings', 'assigned reading', 'assigned readings', 'required reading', 'required readings', 'textbook reading', 'textbook readings', 'read before class', 'chapter', 'chapters'] },
        { type: 'assignment', label: 'Assignment', words: ['assignment', 'assignments', 'exercise', 'exercises', 'discussion', 'case study', 'coding assignment', 'programming assignment'] }
    ];

    const DUE_CUES = ['due', 'deadline', 'submit', 'submission', 'turn in', 'turn-in', 'complete by', 'available until', 'closes', 'scheduled', 'takes place', 'held on', 'occurs on'];
    const NEGATIVE_DATE_CUES = ['office hours', 'instructor', 'professor', 'email', 'phone', 'room ', 'location', 'add/drop', 'add drop', 'withdrawal', 'withdraw', 'holiday', 'no class', 'break', 'course begins', 'classes begin', 'class begins', 'course ends', 'classes end', 'last day to', 'registration', 'academic calendar'];
    const GRADE_KEYWORDS = ['homework', 'assignment', 'assignments', 'quiz', 'quizzes', 'test', 'tests', 'exam', 'exams', 'midterm', 'final', 'lab', 'labs', 'project', 'projects', 'paper', 'papers', 'essay', 'essays', 'presentation', 'presentations', 'participation', 'attendance', 'discussion', 'discussions', 'problem set', 'problem sets', 'reading', 'readings', 'portfolio'];
    const GRADE_NEGATIVE = ['late penalty', 'penalty', 'deduct', 'deduction', 'extra credit', 'bonus', 'plagiarism', 'attendance policy', 'similarity', 'turnitin', 'passing grade', 'minimum grade'];
    const MONTHS = { jan:0,january:0,feb:1,february:1,mar:2,march:2,apr:3,april:3,may:4,jun:5,june:5,jul:6,july:6,aug:7,august:7,sep:8,sept:8,september:8,oct:9,october:9,nov:10,november:10,dec:11,december:11 };

    function app(){ try { return typeof taskScheduler !== 'undefined' ? taskScheduler : null; } catch (_) { return null; } }
    function normalizeSpace(value){ return String(value||'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim(); }
    function normalizeForMatch(value){ return normalizeSpace(value).toLowerCase().replace(/[–—]/g,'-'); }
    function escapeRegex(value){ return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
    function hasPhrase(text, phrase){ const normalized=normalizeForMatch(text); return new RegExp(`(^|[^a-z0-9])${escapeRegex(phrase)}([^a-z0-9]|$)`,'i').test(normalized); }
    function containsAny(text, phrases){ return phrases.some(phrase=>hasPhrase(text,phrase)); }
    function cleanLine(line){ return normalizeSpace(String(line||'').replace(/[•●▪■◆►▶]/g,' ').replace(/\s*\|\s*/g,' | ')); }

    function detectType(text){
        const normalized=normalizeForMatch(text);
        for(const rule of TYPE_RULES){
            const hits=rule.words.filter(word=>hasPhrase(normalized,word));
            if(hits.length) return {type:rule.type,label:rule.label,keywords:hits};
        }
        return null;
    }

    function structuredLinesFromItems(items){
        const rows=[]; const tolerance=2.5;
        (items||[]).forEach((item,index)=>{
            const text=normalizeSpace(item?.str); if(!text)return;
            const transform=Array.isArray(item.transform)?item.transform:[];
            const x=Number(transform[4]||0), y=Number(transform[5]||0);
            let row=rows.find(candidate=>Math.abs(candidate.y-y)<=tolerance);
            if(!row){ row={y,items:[]}; rows.push(row); }
            row.items.push({x,text,index});
        });
        rows.sort((a,b)=>b.y-a.y);
        return rows.map(row=>{ row.items.sort((a,b)=>a.x-b.x||a.index-b.index); return cleanLine(row.items.map(item=>item.text).join(' ')); }).filter(Boolean);
    }

    async function extractPdfText(file){
        const arrayBuffer=await file.arrayBuffer();
        const pdf=await pdfjsLib.getDocument(arrayBuffer).promise;
        const pages=[];
        for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
            const page=await pdf.getPage(pageNumber);
            const textContent=await page.getTextContent();
            pages.push(structuredLinesFromItems(textContent.items).join('\n'));
        }
        return pages.join('\n\n');
    }

    function candidateYear(month,day,explicitYear){
        if(explicitYear){ const y=Number(explicitYear); return y<100?2000+y:y; }
        const now=new Date(); let year=now.getFullYear();
        const candidate=new Date(year,month,day,12,0,0,0);
        if(candidate.getTime()<now.getTime()-45*86400000) year+=1;
        return year;
    }

    function validDate(year,month,day){
        const date=new Date(year,month,day,12,0,0,0);
        if(date.getFullYear()!==year||date.getMonth()!==month||date.getDate()!==day)return null;
        return date;
    }

    function extractDatesFromText(text){
        const source=normalizeSpace(text), results=[], occupied=[];
        function add(match,month,day,year){
            const m=Number(month),d=Number(day),y=candidateYear(m,d,year),date=validDate(y,m,d); if(!date)return;
            const start=match.index??0,end=start+String(match[0]).length;
            if(occupied.some(range=>start<range.end&&end>range.start))return;
            occupied.push({start,end}); results.push({date,raw:String(match[0]).trim(),start,end});
        }
        const monthNames='(January|February|March|April|May|June|July|August|September|Sept|Sep|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Oct|Nov|Dec)';
        let match;
        const monthFirst=new RegExp(`${monthNames}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{2,4}))?`,'gi');
        while((match=monthFirst.exec(source))) add(match,MONTHS[match[1].toLowerCase()],match[2],match[3]);
        const dayFirst=new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthNames}\\.?\\s*(\\d{2,4})?`,'gi');
        while((match=dayFirst.exec(source))) add(match,MONTHS[match[2].toLowerCase()],match[1],match[3]);
        const iso=/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;
        while((match=iso.exec(source))) add(match,Number(match[2])-1,match[3],match[1]);
        const numeric=/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/g;
        while((match=numeric.exec(source))){ const month=Number(match[1]),day=Number(match[2]); if(month>=1&&month<=12&&day>=1&&day<=31)add(match,month-1,day,match[3]); }
        return results.sort((a,b)=>a.start-b.start);
    }

    function lineWindows(text){
        const lines=String(text||'').split(/\r?\n/).map(cleanLine).filter(Boolean),windows=[];
        lines.forEach((line,index)=>{ windows.push({line,context:line,index}); const prev=lines[index-1],next=lines[index+1]; if(prev)windows.push({line,context:`${prev} | ${line}`,index}); if(next)windows.push({line,context:`${line} | ${next}`,index}); });
        return windows;
    }

    function scoreDateContext(context){
        const normalized=normalizeForMatch(context),typeInfo=detectType(normalized),dueHits=DUE_CUES.filter(cue=>hasPhrase(normalized,cue)),negativeHits=NEGATIVE_DATE_CUES.filter(cue=>hasPhrase(normalized,cue));
        let score=0;
        if(typeInfo)score+=4; if(dueHits.length)score+=4;
        if(/\b(?:hw|quiz|test|exam|lab|project|paper|assignment|reading|lecture\s+notes?|chapter|module|week)\s*#?\s*\d+\b/i.test(context))score+=2;
        if(/\b(?:midterm|final)\b/i.test(context))score+=2;
        if(/\b(?:schedule|calendar|week|module)\b/i.test(context)&&typeInfo)score+=1;
        score-=negativeHits.length*4;
        return {score,typeInfo,dueHits,negativeHits};
    }

    function cleanTaskTitle(context,dateRaw,typeInfo){
        let title=cleanLine(context).replace(new RegExp(escapeRegex(dateRaw),'i'),' ').replace(/\b(?:due|deadline|submit|submission|scheduled|held on|occurs on|complete by|by)\b\s*[:\-–—]?/gi,' ').replace(/\s*\|\s*/g,' — ').replace(/\s{2,}/g,' ').replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g,'').trim();
        if(title.length>100)title=title.slice(0,97).trimEnd()+'...';
        if(!title||title.length<3)title=typeInfo?.label||'Syllabus item';
        return title;
    }

    function parseDatesKeyword(text){
        const today=new Date(); today.setHours(0,0,0,0); const byKey=new Map();
        lineWindows(text).forEach(window=>{
            const dateCandidates=extractDatesFromText(window.context); if(!dateCandidates.length)return;
            const scored=scoreDateContext(window.context); if(scored.score<4)return;
            dateCandidates.forEach(candidate=>{
                if(candidate.date<today)return;
                const title=cleanTaskTitle(window.context,candidate.raw,scored.typeInfo),type=scored.typeInfo?.type||'assignment';
                const key=`${candidate.date.toISOString().slice(0,10)}|${type}|${title.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}`;
                const item={date:candidate.date,context:window.context,title,type,confidence:Math.min(100,45+scored.score*9),matchedKeywords:[...(scored.typeInfo?.keywords||[]),...scored.dueHits]};
                const existing=byKey.get(key); if(!existing||item.confidence>existing.confidence||item.context.length<existing.context.length)byKey.set(key,item);
            });
        });
        return Array.from(byKey.values()).sort((a,b)=>a.date-b.date||b.confidence-a.confidence);
    }

    function canonicalGradeName(raw){
        const source=normalizeSpace(raw).replace(/^[-–—:;,.\s]+|[-–—:;,.\s]+$/g,'').replace(/\b(?:weight|weights|worth|percentage|percent|of grade|course grade|grade)\b/gi,' ').replace(/\s{2,}/g,' ').trim();
        const normalized=normalizeForMatch(source);
        const mappings=[[['homework','problem set','pset'],'Homework'],[['assignment'],'Assignments'],[['quiz'],'Quizzes'],[['test'],'Tests'],[['exam','examination'],'Exams'],[['midterm','mid-term','mid term'],'Midterm'],[['final'],'Final Exam'],[['lab','laboratory'],'Labs'],[['project','capstone'],'Projects'],[['paper','essay','report'],'Papers'],[['presentation'],'Presentations'],[['participation'],'Participation'],[['attendance'],'Attendance'],[['discussion'],'Discussions'],[['reading'],'Readings'],[['portfolio'],'Portfolio']];
        for(const [words,label] of mappings){ if(words.some(word=>hasPhrase(normalized,word)))return label; }
        return source.replace(/\b\w/g,char=>char.toUpperCase()).slice(0,50);
    }

    function extractGradePair(context){
        const normalized=cleanLine(context); if(!/%/.test(normalized)||containsAny(normalized,GRADE_NEGATIVE)||!containsAny(normalized,GRADE_KEYWORDS))return null;
        const percentMatches=Array.from(normalized.matchAll(/(?:^|[^\d])(\d{1,3}(?:\.\d+)?)\s*%/g));
        for(const match of percentMatches){
            const weight=Number(match[1]); if(!(weight>0&&weight<=100))continue;
            const index=match.index||0,before=normalized.slice(Math.max(0,index-70),index).trim(),after=normalized.slice(index+match[0].length,index+match[0].length+70).trim();
            const name=canonicalGradeName(before||after); if(name&&name.length>=2)return {name,weight,context:normalized};
        }
        return null;
    }

    function parseGradeCategoriesKeyword(text){
        const lines=String(text||'').split(/\r?\n/).map(cleanLine).filter(Boolean),found=new Map();
        lines.forEach((line,index)=>{
            const contexts=[line]; if(lines[index-1])contexts.push(`${lines[index-1]} | ${line}`); if(lines[index+1])contexts.push(`${line} | ${lines[index+1]}`);
            contexts.forEach(context=>{ const pair=extractGradePair(context); if(!pair)return; const key=pair.name.toLowerCase(); if(!found.has(key))found.set(key,{id:Date.now()+Math.random(),name:pair.name,weight:pair.weight,extractionContext:pair.context}); });
        });
        return Array.from(found.values());
    }

    function enhancedExtractedDatesMessage(dates){
        if(!dates?.length)return 'No assignment, quiz, exam, project, lab, lecture-notes, reading, or due-date keywords were confidently matched in the syllabus.';
        const lines=dates.slice(0,20).map(item=>{ const type=String(item.type||'assignment').replace(/^./,char=>char.toUpperCase()); const confidence=item.confidence?` · ${item.confidence}% match`:''; return `${item.date.toLocaleDateString()} — [${type}] ${item.title||item.context}${confidence}`; });
        if(dates.length>20)lines.push(`...and ${dates.length-20} more extracted dates.`);
        return `Keyword-matched syllabus dates:\n\n${lines.join('\n')}`;
    }

    function patchScheduler(scheduler){
        if(!scheduler||scheduler.__syllabusKeywordV10)return;
        scheduler.parseDates=function(text){return parseDatesKeyword(text);};
        scheduler.parseGradeCategories=function(text){return parseGradeCategoriesKeyword(text);};
        scheduler.showExtractedDates=function(){alert(enhancedExtractedDatesMessage(this.extractedDates||[]));};
        scheduler.handleSyllabusUpload=async function(file){
            if(!file)return;
            const uploadDiv=document.getElementById('syllabusUpload'); uploadDiv?.classList.add('has-file'); if(uploadDiv)uploadDiv.innerHTML='<p>📄 Reading syllabus structure and matching keywords...</p>';
            try{
                const fullText=await extractPdfText(file); this.syllabusText=fullText;
                const categories=parseGradeCategoriesKeyword(fullText),dates=parseDatesKeyword(fullText);
                if(categories.length>0){this.tempCategories=categories;this.renderGradeCategories?.();}
                this.extractedDates=dates;
                const assessmentCount=dates.filter(item=>['quiz','test','exam','midterm','final'].includes(item.type)).length,typeCount=new Set(dates.map(item=>item.type)).size;
                if(uploadDiv)uploadDiv.innerHTML=`<p style="color: var(--success);">✓ Syllabus analyzed with keyword matching</p><p style="font-size: 0.9em; margin-top: 10px; color: var(--text-secondary);">Found ${categories.length} grade categories, ${dates.length} likely due/scheduled dates, ${assessmentCount} assessments, across ${typeCount} task types</p><button type="button" style="margin-top: 10px; padding: 8px 15px; background: var(--info); color: white; border: none; border-radius: 6px; cursor: pointer;" onclick="taskScheduler.showExtractedDates()">View Keyword Matches</button>`;
                this.showNotification?.(`Keyword extraction found ${categories.length} grade categories and ${dates.length} likely task dates.`,'success');
            }catch(error){ console.error('Keyword syllabus extraction failed:',error); uploadDiv?.classList.remove('has-file'); if(uploadDiv)uploadDiv.innerHTML='<p style="color: var(--danger);">Error parsing PDF. Please try another syllabus PDF.</p>'; this.showNotification?.('Error parsing syllabus PDF','error'); }
        };
        scheduler.__syllabusKeywordV10=true;
    }

    function init(){const scheduler=app();if(!scheduler)return setTimeout(init,100);patchScheduler(scheduler);}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500));else setTimeout(init,500);
})();