using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredReader {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public UInt32 Flags;
        public UInt32 Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public UInt32 CredentialBlobSize;
        public IntPtr CredentialBlob;
        public UInt32 Persist;
        public UInt32 AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("Advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    public static extern bool CredFree([In] IntPtr cred);

    public static string ReadSecret(string target, int type) {
        IntPtr credPtr;
        bool read = CredRead(target, type, 0, out credPtr);
        if (!read) return null;
        try {
            CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            if (cred.CredentialBlob == IntPtr.Zero || cred.CredentialBlobSize == 0) return string.Empty;
            byte[] secretBytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, secretBytes, 0, (int)cred.CredentialBlobSize);
            return Encoding.Unicode.GetString(secretBytes).TrimEnd('\0');
        } finally {
            CredFree(credPtr);
        }
    }

    public static string ReadUsername(string target, int type) {
        IntPtr credPtr;
        bool read = CredRead(target, type, 0, out credPtr);
        if (!read) return null;
        try {
            CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            return cred.UserName;
        } finally {
            CredFree(credPtr);
        }
    }
}
