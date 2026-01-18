import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;


        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Security: Validate File Size (Max 5MB)
        const MAX_SIZE = 5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
        }

        // Security: Validate Extension
        const validExtensions = ['.xml', '.musicxml', '.mxl'];
        const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        if (!hasValidExtension) {
            return NextResponse.json({ error: 'Invalid file type. Only MusicXML files are allowed.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const tempDir = os.tmpdir();
        // Sanitize: Use random string for temp filename
        const randomId = Math.random().toString(36).substring(2, 15);
        const inputPath = join(tempDir, `input-${Date.now()}-${randomId}.musicxml`);
        const outputPath = join(tempDir, `output-${Date.now()}-${randomId}.mid`);

        // 1. Write the uploaded file to temp
        await writeFile(inputPath, buffer);

        // 2. Run the conversion script
        // Note: We use 'uv run' to execute the script in the correct environment
        // We assume the script is at 'scripts/musicxml_to_midi.py' relative to CWD
        const scriptPath = join(process.cwd(), 'scripts', 'musicxml_to_midi.py');
        const command = `uv run "${scriptPath}" "${inputPath}" "${outputPath}"`;

        await execAsync(command);

        // 3. Read the output MIDI file
        const midiBuffer = await readFile(outputPath);

        // 4. Cleanup
        await Promise.allSettled([
            unlink(inputPath),
            unlink(outputPath)
        ]);

        // 5. Return the MIDI data
        return new NextResponse(midiBuffer, {
            headers: {
                'Content-Type': 'audio/midi',
                'Content-Disposition': `attachment; filename="${file.name.replace(/\.(xml|musicxml)$/i, '')}.mid"`
            }
        });

    } catch (error) {
        console.error('Conversion error:', error);
        return NextResponse.json(
            { error: 'Failed to convert file', details: String(error) },
            { status: 500 }
        );
    }
}
