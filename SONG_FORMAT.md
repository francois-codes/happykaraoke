# HappiKaraoke Song Format Documentation

## Overview

HappiKaraoke uses plain text files (`.txt`) with a structured format for storing song lyrics and chords. This format is designed to be human-readable and easy to edit with any text editor.

---

## File Structure

### Basic Template

```
Song Title
Artist Name
G
tags space separated

[Section Header]
Chord line
Lyrics line

Chord line
Lyrics line
```

### Field Breakdown

#### Line 1: Title (Required)
```
My Awesome Song
```
- The complete song title
- Used for display and search
- Can contain any characters

#### Line 2: Author/Artist (Required)
```
The Artist Name
```
- Artist or band name
- Used for display and search
- Can contain any characters

#### Line 3: Key (Required)
```
G
```
- Musical key of the song
- Format: Single letter (A-G) with optional sharp (#) or flat (b)
- Examples: `C`, `D#`, `Bb`, `F#`
- Used as reference for transposition

#### Line 4: Tags (Required, can be empty)
```
rock upbeat classic
```
- Space-separated keywords
- Used for filtering and searching
- Examples: `rock`, `pop`, `slow`, `ballad`, `upbeat`, `classic`
- Can be empty line if no tags

#### Line 5: Blank Separator (Required)
```

```
- Empty line separating metadata from content
- **Must be present**

#### Lines 6+: Song Content
- Alternating chord and lyric lines
- Section headers
- Blank lines for spacing

---

## Song Content Format

### Chord Lines

Chord lines are automatically detected if **all words** match chord patterns.

**Basic chords:**
```
C  Am  F  G
```

**Extended chords:**
```
Cmaj7  Dm7  G7sus4  Amadd9
```

**Slash chords (bass notes):**
```
C/G  D/F#  Am/E
```

**Common notation:**
- Major: `C`, `Cmaj`, `Cmaj7`
- Minor: `Cm`, `Cmin`, `Cm7`
- Dominant: `C7`, `C9`, `C11`, `C13`
- Suspended: `Csus2`, `Csus4`, `C7sus4`
- Diminished: `Cdim`, `Cdim7`
- Augmented: `Caug`, `C+`
- Added notes: `Cadd9`, `Cadd11`
- Alterations: `C#5`, `Cb5`, `C#9`, `Cb9`

**Special markers:**
- `N.C` or `NC` - No chord
- `%` - Repeat previous chord
- `|` - Measure separator
- `_` - Alternative measure separator

**Time signatures:**
```
4/4  3/4  6/8  12/8
```

### Lyric Lines

Any line that doesn't match chord patterns is treated as lyrics.

```
This is a lyric line with regular text
```

### Section Headers

Lines starting with `#` or `[` are treated as section headers.

**Examples:**
```
# Verse 1
[Chorus]
# Bridge
[Outro]
```

**Common sections:**
- `[Intro]` / `# Intro`
- `[Verse 1]` / `# Verse 1`
- `[Chorus]` / `# Chorus`
- `[Bridge]` / `# Bridge`
- `[Outro]` / `# Outro`
- `[Solo]` / `# Solo`
- `[Instrumental]` / `# Instrumental`

### Blank Lines

Empty lines create visual breaks in the song.

```
First verse...

Second verse...
```

---

## Complete Example

### Example 1: Basic Song

```
Let It Be
The Beatles
C
classic rock ballad

[Verse 1]
C                G
When I find myself in times of trouble
Am              F
Mother Mary comes to me
C                G              F    C
Speaking words of wisdom, let it be

[Chorus]
C                G
Let it be, let it be
Am              F
Let it be, let it be
C                G              F    C
Whisper words of wisdom, let it be
```

### Example 2: Advanced Formatting

```
Blackbird
The Beatles
G
classic fingerpicking

[Intro]
G  Am7  G/B  G
4/4

[Verse 1]
G           Am7        G/B        G
Blackbird singing in the dead of night
C          A7/C#       D7         B7/D#    Em    Eb
Take these broken wings and learn to fly
D    C#dim  Cm   Cm/Bb
All  your   life
G/B              A7               C        G
You were only waiting for this moment to arise

[Instrumental]
| C G/B A7 | C/G G |

[Bridge]
F    Em    Dm       C     Bb6   C
Black-bird  fly
F    Em    Dm       C     Bb6   A7
Black-bird  fly
D7                              G
Into the light of a dark black night
```

### Example 3: No Chords (Lyrics Only)

```
Happy Birthday
Traditional
C
celebration traditional

[Chorus]
Happy birthday to you
Happy birthday to you
Happy birthday dear [name]
Happy birthday to you
```

---

## Parser Behavior

### Automatic Line Type Detection

The parser determines line types in this order:

1. **Empty line** → Break (rendered as `(...)`)
2. **Starts with `#` or `[`** → Section header
3. **All words match chord regex** → Chord line
4. **Everything else** → Lyric line

### Chord Detection Algorithm

A line is identified as chords if **all words** match:

1. **Chord pattern**: `[A-G][#|b]?[maj|min|m|sus|aug|dim|add]?[0-9]*[/[A-G][#|b]?]?`
2. **Separator**: `|`, `%`, `N.C`, `NC`, `_`
3. **Time signature**: `\d+/\d+` (e.g., `4/4`)

### Context-Aware Parsing

**Section + Chord pattern:**
```
[Verse 1]
C  Am  F  G          ← Detected as chords (follows section)
```

**Chord + Lyric pattern:**
```
C           Am        ← Detected as chords
Let it be, let it be  ← Detected as lyrics (follows chords)
```

**Break handling:**
- Empty line after lyrics + before chords → Section separator
- Empty line after chords → Spacer (extra vertical space)

---

## Transposition

### How It Works

When transposition is applied (e.g., +2 semitones):

**Original:**
```
C  Am  F  G
```

**Transposed (+2):**
```
D  Bm  G  A
```

### Transposition Preserves:
- Chord extensions (e.g., `Cmaj7` → `Dmaj7`)
- Bass notes (e.g., `C/G` → `D/A`)
- Special markers (`N.C`, `%`, `|`)
- Time signatures

### Transposition Range
- Minimum: -12 semitones (one octave down)
- Maximum: +12 semitones (one octave up)
- Most common: -7 to +5 (for voice range adjustment)

---

## Best Practices

### 1. Consistent Formatting

**Good:**
```
C           Am          F           G
When I find myself in times of trouble
```

**Avoid:**
```
C Am F G
When I find myself in times of trouble
```
*(Chords should align with lyrics below)*

### 2. Section Headers

Use consistent section naming:
```
[Verse 1]
[Verse 2]
[Chorus]
[Bridge]
```

Not:
```
[V1]
[Verse Two]
[CHORUS]
```

### 3. Spacing

Use blank lines to separate song sections:
```
[Verse 1]
Lyrics...

[Chorus]
Lyrics...
```

### 4. Chord Alignment

Align chords above the syllable where they change:

**Good:**
```
C              G           Am
Let it be, let it be, let it be
```

**Less ideal:**
```
C G Am
Let it be, let it be, let it be
```

### 5. Special Characters

Avoid using special characters that might break parsing:
- Tabs (use spaces instead)
- Smart quotes (use `"` and `'`)
- Em dashes (use `-`)
- Non-ASCII characters (when possible)

---

## File Naming

### Recommended Format

```
Song Title.txt
Artist Name - Song Title.txt
```

### Rules
- Use `.txt` extension
- Avoid special characters: `/ \ : * ? " < > |`
- Case-insensitive (parser handles case variations)
- Spaces are allowed

### Examples
```
Let It Be.txt
The Beatles - Let It Be.txt
Blackbird.txt
```

---

## Folder Structure

### Recommended Organization

```
~/Music/Karaoke/
├── The Beatles/
│   ├── Let It Be.txt
│   ├── Blackbird.txt
│   └── Yesterday.txt
├── Bob Dylan/
│   ├── Blowin In The Wind.txt
│   └── Like A Rolling Stone.txt
└── Classic Rock/
    ├── Hotel California.txt
    └── Sweet Child O Mine.txt
```

### Rules
- All `.txt` files in configured folder are scanned
- Subfolders are **not** scanned (flat structure only)
- Hidden files (starting with `.`) are ignored

---

## Common Mistakes

### 1. Missing Blank Line After Tags

**Wrong:**
```
Song Title
Artist
C
tags
[Verse 1]    ← Parser expects blank line before this
```

**Correct:**
```
Song Title
Artist
C
tags

[Verse 1]
```

### 2. Mixed Chords and Lyrics on Same Line

**Wrong:**
```
C Am F G Let it be, let it be
```

**Correct:**
```
C           Am          F           G
Let it be, let it be, let it be, let it be
```

### 3. Invalid Chord Notation

**Wrong:**
```
Chord1  Chord2  Chord3
```

**Correct:**
```
C  Am  F
```

### 4. Inconsistent Key Notation

**Wrong:**
```
G#    (in file header)
Ab    (in chord lines)
```

**Correct:**
```
G#    (in file header)
G#    (in chord lines)
```
*Or use `Ab` consistently throughout*

---

## Tools and Tips

### Editing Songs

**Recommended text editors:**
- **macOS**: TextEdit (plain text mode), VS Code, Sublime Text
- **Windows**: Notepad++, VS Code, Sublime Text
- **Linux**: gedit, VS Code, vim, nano

**Settings:**
- Use **spaces** (not tabs)
- UTF-8 encoding
- Unix line endings (LF) preferred, but CRLF works too

### Converting from Other Formats

**ChordPro (.chopro, .cho):**
```chordpro
{title: Song Title}
{artist: Artist Name}
{key: C}

[C]Let it [G]be
```

**Convert to HappiKaraoke format:**
```
Song Title
Artist Name
C
tags

C       G
Let it be
```

### Validating Song Files

Check your song file:
1. Open in HappiKaraoke
2. Verify chords display correctly
3. Test transposition
4. Check for parsing errors in console

---

## Advanced Features

### Inline Chord Markers (Not Supported)

HappiKaraoke uses **separate chord and lyric lines**. Inline formats like this are **not supported**:

```
Let it [C]be, let it [G]be
```

### Tablature (Experimental)

Guitar tab notation is treated as chords if it matches patterns:

```
e|---0---0---0---0---|
B|---1---1---1---1---|
G|---0---0---0---0---|
D|---2---2---2---2---|
A|---3---3---3---3---|
E|-------------------|
```

**Note:** Tab support is limited and may not display correctly.

---

## FAQ

**Q: Can I use capo notation?**
A: Not directly supported. Adjust the key in the header instead.

**Q: Can I have multiple songs in one file?**
A: No. Each song must be a separate `.txt` file.

**Q: What encoding should I use?**
A: UTF-8 is recommended, but ASCII works fine for English songs.

**Q: Can I include lyrics in multiple languages?**
A: Yes, UTF-8 supports all Unicode characters.

**Q: How do I indicate repeats?**
A: Use section headers like `[Verse 1]`, `[Chorus]` and list them multiple times, or use song structure notes.

**Q: Can I add comments?**
A: No dedicated comment syntax. Use section headers for notes: `# Note: Play softly`

---

## Migration Guide

### From ChordPro

**ChordPro format:**
```
{title: My Song}
{artist: Artist}
{key: C}

{start_of_verse}
[C]Lyric [G]text
{end_of_verse}

{start_of_chorus}
[Am]Chorus [F]text
{end_of_chorus}
```

**HappiKaraoke format:**
```
My Song
Artist
C
tags

[Verse]
C       G
Lyric text

[Chorus]
Am      F
Chorus text
```

### From Ultimate Guitar Text Format

**Ultimate Guitar:**
```
My Song by Artist

Intro: C G Am F

Verse 1:
  C        G
Lyric text here
  Am       F
More lyrics here
```

**HappiKaraoke:**
```
My Song
Artist
C
tags

[Intro]
C  G  Am  F

[Verse 1]
C        G
Lyric text here
Am       F
More lyrics here
```

---

## Troubleshooting

### Issue: Chords not detected

**Symptoms:** Chord lines appear as lyrics

**Solutions:**
1. Verify all words on line are valid chords
2. Check for typos: `Csus4` not `Csus 4`
3. Ensure spaces separate chords: `C Am` not `CAm`
4. Remove trailing spaces or special characters

### Issue: Song not loading

**Symptoms:** Song doesn't appear in songs list

**Solutions:**
1. Verify file has `.txt` extension
2. Check file is in configured songs folder
3. Ensure file is not in a subfolder
4. Verify file is readable (not locked)
5. Check for invalid UTF-8 characters

### Issue: Incorrect transposition

**Symptoms:** Chords transpose to wrong notes

**Solutions:**
1. Verify key in header matches actual song key
2. Check for mixed sharp/flat notation
3. Ensure chord format is correct: `C#` not `C #`

---

## Reference: Valid Chord Components

### Roots
```
A, A#, Ab, B, Bb, C, C#, D, D#, Db, E, Eb, F, F#, G, G#, Gb
```

### Qualities
```
(none)  - Major
m       - Minor
min     - Minor
maj     - Major
dim     - Diminished
aug     - Augmented
```

### Extensions
```
7, 9, 11, 13
maj7, min7
sus2, sus4
add9, add11
```

### Modifiers
```
#5, b5, #9, b9
6, 6/9
```

### Bass Notes (Slash Chords)
```
/A, /A#, /Ab, /B, /Bb, /C, /C#, /D, /D#, /Db, /E, /Eb, /F, /F#, /G, /G#, /Gb
```

---

## Appendix: Regular Expressions

### Chord Detection Pattern

```regex
^[ABCDEFG](?:#|##|b|bb)?(?:maj|min|m|sus|aug|dim|add)?[0-9]*(?:/[ABCDEFG](?:#|b)?)?$
```

**Explanation:**
- `^` - Start of string
- `[ABCDEFG]` - Root note
- `(?:#|##|b|bb)?` - Optional sharp or flat
- `(?:maj|min|m|sus|aug|dim|add)?` - Optional quality
- `[0-9]*` - Optional extension numbers
- `(?:/[ABCDEFG](?:#|b)?)?` - Optional bass note
- `$` - End of string

---

For more information, see:
- `ARCHITECTURE.md` - System architecture
- `DEVELOPER_GUIDE.md` - Development guide
- `src/shared/lib/song/song.ts` - Parser implementation
- `src/shared/lib/transpose/` - Transposition logic
