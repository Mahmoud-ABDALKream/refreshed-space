import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptMessage, decryptMessage } from "@/lib/crypto";

// POST: Send an encrypted message
export async function POST(request: NextRequest) {
  try {
    const { senderId, receiverId, plaintext } = await request.json();

    if (!senderId || !receiverId || !plaintext) {
      return NextResponse.json(
        { error: "senderId, receiverId, and plaintext are required" },
        { status: 400 }
      );
    }

    // Verify sender exists
    const sender = await db.user.findUnique({ where: { id: senderId } });
    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 404 });
    }

    // Verify receiver exists and get their public key
    const receiver = await db.user.findUnique({ where: { id: receiverId } });
    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 }
      );
    }

    // Encrypt the message using the receiver's public key
    const ciphertext = encryptMessage(plaintext, receiver.publicKey);

    // Store the encrypted message
    const message = await db.message.create({
      data: {
        senderId,
        receiverId,
        ciphertext,
        encryptionType: "RSA-OAEP-AES-256-CBC",
      },
    });

    return NextResponse.json(
      {
        message: "Message sent and encrypted successfully",
        data: {
          id: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          encryptionType: message.encryptionType,
          createdAt: message.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: List messages for a user (sent or received)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type") || "received"; // "sent" or "received"
    const decrypt = searchParams.get("decrypt") === "true";

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const where = type === "sent" ? { senderId: userId } : { receiverId: userId };

    const messages = await db.message.findMany({
      where,
      include: {
        sender: { select: { id: true, username: true } },
        receiver: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Optionally decrypt messages
    const result = messages.map((msg) => {
      let decryptedText: string | null = null;
      if (decrypt && type === "received") {
        try {
          decryptedText = decryptMessage(msg.ciphertext, user.privateKey);
        } catch {
          decryptedText = "[Decryption failed]";
        }
      }

      return {
        id: msg.id,
        sender: msg.sender,
        receiver: msg.receiver,
        ciphertext: msg.ciphertext,
        plaintext: decryptedText,
        encryptionType: msg.encryptionType,
        createdAt: msg.createdAt,
      };
    });

    return NextResponse.json({ messages: result });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
