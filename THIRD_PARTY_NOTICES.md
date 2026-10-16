# Third-party notices

## StormLib (reference for MPQ format semantics)

`src/mpq/crypt.ts` and `src/mpq/decompress.ts` implement algorithms whose
semantics were ported from the public StormLib reference so that behaviour
matches real archives exactly (hash selectors, the block cipher, the
plain-name file key, and the fixed codec order of a combined compression
mask). The TypeScript code here is an independent implementation; no C++
source is copied verbatim.

StormLib — <https://github.com/ladislav-zezula/StormLib>
Copyright (c) Ladislav Zezula — MIT License.

## AMD FidelityFX Super Resolution 1 (EASU + RCAS)

`src/client/render/fsr-upscale.ts` ports the FSR 1 edge-adaptive spatial
upsampling (EASU) and robust contrast-adaptive sharpening (RCAS) algorithms
from AMD's reference `ffx_fsr1.h` to GLSL ES 3.00.

FidelityFX FSR — <https://github.com/GPUOpen-Effects/FidelityFX-FSR>
Copyright (c) 2021 Advanced Micro Devices, Inc. — MIT License.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
