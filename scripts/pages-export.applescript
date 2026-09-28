-- Exporteert één Pages-document naar Word (.docx).
-- Aanroep: osascript pages-export.applescript <bron.pages> <doel.docx>
on run argv
	set srcPath to item 1 of argv
	set outPath to item 2 of argv
	tell application "Pages"
		-- Ruime timeout: grote documenten met veel hi-res beelden exporteren traag.
		with timeout of 600 seconds
			activate
			-- Sluit eventueel achtergebleven documenten van een vorige ronde.
			try
				close every document saving no
			end try
			open (POSIX file srcPath)
			-- Wacht tot het document daadwerkelijk geladen is.
			set n to 0
			repeat until (count of documents) > 0
				delay 0.5
				set n to n + 1
				if n > 60 then error "geen document geopend na 30s: " & srcPath
			end repeat
			delay 1
			export document 1 to (POSIX file outPath) as Microsoft Word
			close every document saving no
		end timeout
	end tell
	return "ok"
end run
