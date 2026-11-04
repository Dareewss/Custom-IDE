using System;
using System.Globalization;
using System.Runtime.InteropServices;

internal static class DesktopBlur
{
    [StructLayout(LayoutKind.Sequential)]
    private struct AccentPolicy
    {
        public int State;
        public int Flags;
        public uint Color;
        public int Animation;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct CompositionAttribute
    {
        public int Attribute;
        public IntPtr Data;
        public UIntPtr Size;
    }

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool IsWindow(IntPtr window);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetWindowCompositionAttribute(IntPtr window, ref CompositionAttribute data);

    private static int Main(string[] args)
    {
        try
        {
            ulong handle;
            uint expectedOwner;
            if (args.Length != 3 || !ulong.TryParse(args[0], NumberStyles.None, CultureInfo.InvariantCulture, out handle)
                || !uint.TryParse(args[1], out expectedOwner) || expectedOwner == 0
                || (args[2] != "on" && args[2] != "off"))
                throw new ArgumentException("Expected window handle, owner process and on/off.");

            IntPtr window = new IntPtr(unchecked((long)handle));
            uint actualOwner;
            if (!IsWindow(window) || GetWindowThreadProcessId(window, out actualOwner) == 0 || actualOwner != expectedOwner)
                throw new InvalidOperationException("Window does not belong to the requesting application.");

            bool enabled = args[2] == "on";
            // Accent acrylic samples the desktop. One alpha step avoids the zero-alpha
            // compositor edge case without adding the system material's opaque tint.
            AccentPolicy policy = new AccentPolicy { State = enabled ? 4 : 0, Color = enabled ? 0x01000000u : 0u };
            IntPtr memory = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(AccentPolicy)));
            try
            {
                Marshal.StructureToPtr(policy, memory, false);
                CompositionAttribute data = new CompositionAttribute {
                    Attribute = 19, Data = memory, Size = new UIntPtr((uint)Marshal.SizeOf(typeof(AccentPolicy)))
                };
                if (!SetWindowCompositionAttribute(window, ref data))
                    throw new InvalidOperationException("Windows rejected desktop blur (" + Marshal.GetLastWin32Error() + ").");
                // This acknowledges the setter; the undocumented getter cannot read
                // accent policy reliably on supported Windows builds.
                Console.WriteLine("{\"accepted\":true,\"enabled\":" + (enabled ? "true" : "false") + ",\"accentState\":" + policy.State
                    + ",\"tintAlpha\":" + (policy.Color >> 24) + "}");
            }
            finally { Marshal.FreeHGlobal(memory); }
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine(error.Message);
            return 1;
        }
    }
}
